'use strict';
const express = require('express');
const { findOne, findAll, getById, add, update, nextCounter } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function calcMonthlyPayment(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function generateSchedule(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  const monthly = calcMonthlyPayment(principal, annualRate, months);
  let balance = principal;
  const schedule = [];
  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPart = monthly - interest;
    balance -= principalPart;
    schedule.push({
      month: i,
      payment: parseFloat(monthly.toFixed(2)),
      principal: parseFloat(principalPart.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      balance: parseFloat(Math.max(0, balance).toFixed(2))
    });
  }
  return schedule;
}

// POST /api/loans/calculate (no auth needed — placed before router.use authenticate)
router.post('/calculate', (req, res) => {
  const { amount, duration_months, interest_rate = 7 } = req.body;
  if (!amount || !duration_months) {
    return res.status(400).json({ error: 'amount no duration_months obrigatóriu' });
  }
  const monthly = calcMonthlyPayment(parseFloat(amount), parseFloat(interest_rate), parseInt(duration_months));
  const schedule = generateSchedule(parseFloat(amount), parseFloat(interest_rate), parseInt(duration_months));
  res.json({
    monthly_payment: monthly.toFixed(2),
    total_repayment: (monthly * parseInt(duration_months)).toFixed(2),
    schedule
  });
});

// GET /api/loans (admin)
router.get('/', authorize('admin', 'president'), async (req, res) => {
  try {
    const { status } = req.query;
    let loans = await findAll('loans', [], 'applied_date', true);
    if (status) loans = loans.filter(l => l.status === status);
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/loans/member/:memberId
router.get('/member/:memberId', async (req, res) => {
  try {
    if (req.user.role === 'member') {
      const m = await findOne('members', [['user_id', '==', req.user.id]]);
      if (!m || m.id !== req.params.memberId) return res.status(403).json({ error: 'Laiha permisaun' });
    }
    const loans = await findAll('loans', [['member_id', '==', req.params.memberId]], 'applied_date', true);
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/loans/:id
router.get('/:id', async (req, res) => {
  try {
    const loan = await getById('loans', req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimu la hetan' });
    if (req.user.role === 'member') {
      const m = await findOne('members', [['user_id', '==', req.user.id]]);
      if (!m || loan.member_id !== m.id) return res.status(403).json({ error: 'Laiha permisaun' });
    }
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/loans/:id/schedule
router.get('/:id/schedule', async (req, res) => {
  try {
    const loan = await getById('loans', req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimu la hetan' });

    const schedule = generateSchedule(loan.amount, loan.interest_rate, loan.duration_months);
    const repayments = await findAll('loan_repayments', [['loan_id', '==', req.params.id]], 'month_number');

    const merged = schedule.map(s => ({
      ...s,
      paid: repayments.find(r => r.month_number === s.month) || null
    }));
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// POST /api/loans
router.post('/', async (req, res) => {
  try {
    const { member_id, amount, purpose, duration_months, collateral, guarantor_name, guarantor_phone } = req.body;
    if (!member_id || !amount || !purpose || !duration_months) {
      return res.status(400).json({ error: 'Kamnaran obrigatóriu la kompletu' });
    }

    const member = await getById('members', member_id);
    if (!member) return res.status(404).json({ error: 'Membru la hetan' });
    if (req.user.role === 'member' && member.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Laiha permisaun' });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    if (month === 10 || month === 11) {
      return res.status(400).json({ error: 'Iha Outubro no Novembro la simu pedidu empréstimu foun' });
    }

    const existingActive = await findAll('loans', [
      ['member_id', '==', member_id],
      ['status', 'in', ['active', 'approved']]
    ]);
    if (existingActive.length > 0) {
      const repayments = await findAll('loan_repayments', [['loan_id', '==', existingActive[0].id]]);
      const paidPct = repayments.length / existingActive[0].duration_months;
      if (paidPct < 0.9) {
        return res.status(400).json({ error: 'Ita iha empréstimu ativo. Tenke hatan ≥90% molok husu fali' });
      }
    }

    const interest_rate = member.member_type === 'employee' ? 7.00 : 12.00;
    const monthly_payment = calcMonthlyPayment(parseFloat(amount), interest_rate, parseInt(duration_months));
    const total_repayment = monthly_payment * parseInt(duration_months);

    const count = await nextCounter('loanCount');
    const loan_ref = `LN-${now.getFullYear()}-${String(count).padStart(3, '0')}`;

    const loanId = await add('loans', {
      loan_ref, member_id, full_name: member.full_name, member_no: member.member_no, phone: member.phone || null,
      amount: parseFloat(amount), purpose, duration_months: parseInt(duration_months),
      interest_rate, monthly_payment: parseFloat(monthly_payment.toFixed(2)),
      total_repayment: parseFloat(total_repayment.toFixed(2)),
      collateral: collateral || null, guarantor_name: guarantor_name || null, guarantor_phone: guarantor_phone || null,
      status: 'pending', applied_date: now.toISOString().split('T')[0],
      approved_date: null, approved_by: null, approved_by_name: null, notes: null
    });

    res.status(201).json({
      id: loanId, loan_ref,
      monthly_payment: monthly_payment.toFixed(2),
      total_repayment: total_repayment.toFixed(2),
      message: 'Pedidu empréstimu submete ho susesu'
    });
  } catch (err) {
    console.error('Loan create error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// PUT /api/loans/:id/approve
router.put('/:id/approve', authorize('admin', 'president'), async (req, res) => {
  try {
    const loan = await getById('loans', req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimu la hetan' });
    if (loan.status !== 'pending') return res.status(400).json({ error: "Pedidu ne'e la iha estadu pendente" });
    if (parseFloat(loan.amount) >= 1000 && req.user.role !== 'president') {
      return res.status(403).json({ error: 'Empréstimu ≥$1,000 presiza aprovál Presidente' });
    }

    await update('loans', req.params.id, {
      status: 'approved',
      approved_date: new Date().toISOString().split('T')[0],
      approved_by: req.user.id,
      approved_by_name: req.user.username,
      notes: req.body.notes || null
    });
    res.json({ message: 'Empréstimu aprova ho susesu' });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// PUT /api/loans/:id/reject
router.put('/:id/reject', authorize('admin', 'president'), async (req, res) => {
  try {
    const loan = await getById('loans', req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimu la hetan' });

    await update('loans', req.params.id, {
      status: 'rejected',
      approved_by: req.user.id,
      notes: req.body.notes || null
    });
    res.json({ message: 'Empréstimu rejeita ho susesu' });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// POST /api/loans/:id/repayment
router.post('/:id/repayment', authorize('admin', 'president'), async (req, res) => {
  try {
    const loan = await getById('loans', req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimu la hetan' });

    const { month_number, amount_paid, paid_date } = req.body;
    const schedule = generateSchedule(loan.amount, loan.interest_rate, loan.duration_months);
    const monthData = schedule[month_number - 1];

    await add('loan_repayments', {
      loan_id: req.params.id,
      month_number: parseInt(month_number),
      amount_paid: parseFloat(amount_paid),
      principal: monthData.principal,
      interest: monthData.interest,
      balance: monthData.balance,
      paid_date: paid_date || new Date().toISOString().split('T')[0]
    });

    const repayments = await findAll('loan_repayments', [['loan_id', '==', req.params.id]]);
    if (repayments.length >= loan.duration_months) {
      await update('loans', req.params.id, { status: 'completed' });
    }

    res.status(201).json({ message: 'Pagamentu rejista ho susesu' });
  } catch (err) {
    console.error('Repayment error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
