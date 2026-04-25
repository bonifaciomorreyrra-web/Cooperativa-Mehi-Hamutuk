'use strict';
const express = require('express');
const { findAll } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin', 'president'));

router.get('/monthly', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    const [allSavings, allLoans, allRepayments, allMembers] = await Promise.all([
      findAll('savings'),
      findAll('loans'),
      findAll('loan_repayments'),
      findAll('members')
    ]);

    const savings = allSavings.filter(s => String(s.transaction_date || '').startsWith(prefix));
    const loans = allLoans.filter(l => String(l.applied_date || '').startsWith(prefix));
    const repayments = allRepayments.filter(r => String(r.paid_date || '').startsWith(prefix));
    const activeMembers = allMembers.filter(m => m.status === 'active').length;
    const totalSavings = allSavings.reduce((sum, s) =>
      sum + (s.type === 'penalty' ? -parseFloat(s.amount || 0) : parseFloat(s.amount || 0)), 0);
    const activeLoans = allLoans
      .filter(l => l.status === 'active' || l.status === 'approved')
      .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

    const savingsSummary = savings.reduce((acc, s) => {
      const amt = parseFloat(s.amount || 0);
      if (s.type === 'mandatory') acc.mandatory += amt;
      else if (s.type === 'voluntary') acc.voluntary += amt;
      else if (s.type === 'dividend') acc.dividend += amt;
      else if (s.type === 'penalty') acc.penalty += amt;
      acc.contributors.add(s.member_id);
      return acc;
    }, { mandatory: 0, voluntary: 0, dividend: 0, penalty: 0, contributors: new Set() });

    const loansSummary = loans.reduce((acc, l) => {
      acc.total_applications++;
      if (l.status === 'approved' || l.status === 'active') { acc.approved++; acc.total_approved_amount += parseFloat(l.amount || 0); }
      else if (l.status === 'rejected') acc.rejected++;
      else if (l.status === 'pending') acc.pending++;
      return acc;
    }, { total_applications: 0, approved: 0, rejected: 0, pending: 0, total_approved_amount: 0 });

    const repaymentsSummary = repayments.reduce((acc, r) => {
      acc.total_collected += parseFloat(r.amount_paid || 0);
      acc.payments_received++;
      return acc;
    }, { total_collected: 0, payments_received: 0 });

    res.json({
      period: prefix,
      savings: { ...savingsSummary, contributors: savingsSummary.contributors.size },
      loans: loansSummary,
      repayments: repaymentsSummary,
      totals: { active_members: activeMembers, total_savings: totalSavings, active_loans: activeLoans }
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.get('/annual', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const [allSavings, allRepayments] = await Promise.all([
      findAll('savings'),
      findAll('loan_repayments')
    ]);

    const monthly = [];
    for (let m = 1; m <= 12; m++) {
      const prefix = `${year}-${String(m).padStart(2, '0')}`;
      const savingsTotal = allSavings
        .filter(s => String(s.transaction_date || '').startsWith(prefix) && s.type !== 'penalty')
        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
      const repaymentsTotal = allRepayments
        .filter(r => String(r.paid_date || '').startsWith(prefix))
        .reduce((sum, r) => sum + parseFloat(r.amount_paid || 0), 0);
      monthly.push({ month: m, savings: savingsTotal, loan_repayments: repaymentsTotal });
    }
    res.json({ year, monthly });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.get('/loans', async (req, res) => {
  try {
    const [loans, allRepayments] = await Promise.all([
      findAll('loans', [], 'applied_date', true),
      findAll('loan_repayments')
    ]);

    const result = loans.map(l => ({
      ...l,
      paid_amount: allRepayments
        .filter(r => r.loan_id === l.id)
        .reduce((sum, r) => sum + parseFloat(r.amount_paid || 0), 0)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.get('/members', async (req, res) => {
  try {
    const [members, allSavings, allLoans] = await Promise.all([
      findAll('members', [], 'member_no'),
      findAll('savings'),
      findAll('loans')
    ]);

    const result = members.map(m => {
      const mSavings = allSavings.filter(s => s.member_id === m.id);
      const balance = mSavings.reduce((sum, s) =>
        sum + (s.type === 'penalty' ? -parseFloat(s.amount || 0) : parseFloat(s.amount || 0)), 0);
      const active_loans = allLoans.filter(l =>
        l.member_id === m.id && (l.status === 'active' || l.status === 'approved')).length;
      return { ...m, balance, active_loans };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
