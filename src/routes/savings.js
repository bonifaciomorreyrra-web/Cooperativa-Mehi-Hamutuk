'use strict';
const express = require('express');
const { findOne, findAll, add } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function calcBalance(savings) {
  return savings.reduce((acc, s) => {
    const amount = parseFloat(s.amount) || 0;
    if (s.type === 'penalty') {
      acc.balance -= amount;
    } else {
      acc.balance += amount;
      if (s.type === 'mandatory') acc.mandatory_total += amount;
      else if (s.type === 'voluntary') acc.voluntary_total += amount;
      else if (s.type === 'dividend') acc.dividend_total += amount;
    }
    return acc;
  }, { balance: 0, mandatory_total: 0, voluntary_total: 0, dividend_total: 0 });
}

// GET /api/savings/report/monthly  (must come before /:memberId)
router.get('/report/monthly', authorize('admin', 'president'), async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const all = await findAll('savings');
    const yearStr = String(year);

    const byMonth = {};
    for (const s of all) {
      const d = String(s.transaction_date || '');
      if (!d.startsWith(yearStr)) continue;
      const m = d.slice(5, 7);
      if (!m) continue;
      if (!byMonth[m]) byMonth[m] = { month: m, mandatory: 0, voluntary: 0, dividend: 0, penalty: 0, member_ids: new Set() };
      const amt = parseFloat(s.amount) || 0;
      if (s.type === 'mandatory') byMonth[m].mandatory += amt;
      else if (s.type === 'voluntary') byMonth[m].voluntary += amt;
      else if (s.type === 'dividend') byMonth[m].dividend += amt;
      else if (s.type === 'penalty') byMonth[m].penalty += amt;
      if (s.member_id) byMonth[m].member_ids.add(s.member_id);
    }

    const result = Object.values(byMonth).map(r => ({
      month: r.month, mandatory: r.mandatory, voluntary: r.voluntary,
      dividend: r.dividend, penalty: r.penalty, member_count: r.member_ids.size
    })).sort((a, b) => a.month.localeCompare(b.month));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/savings/:memberId
router.get('/:memberId', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const member = await findOne('members', [['user_id', '==', req.user.id]]);
    if (req.user.role === 'member') {
      const m = await findOne('members', [['user_id', '==', req.user.id]]);
      if (!m || m.id !== memberId) return res.status(403).json({ error: 'Laiha permisaun' });
    }

    const savings = await findAll('savings', [['member_id', '==', memberId]], 'transaction_date', true);
    res.json(savings);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/savings/:memberId/balance
router.get('/:memberId/balance', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    if (req.user.role === 'member') {
      const m = await findOne('members', [['user_id', '==', req.user.id]]);
      if (!m || m.id !== memberId) return res.status(403).json({ error: 'Laiha permisaun' });
    }

    const savings = await findAll('savings', [['member_id', '==', memberId]]);
    res.json(calcBalance(savings));
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// POST /api/savings
router.post('/', authorize('admin', 'president'), async (req, res) => {
  try {
    const { member_id, amount, type, description, transaction_date } = req.body;
    if (!member_id || !amount || !type) {
      return res.status(400).json({ error: 'member_id, amount no type obrigatóriu' });
    }

    const existing = await findAll('savings', [['member_id', '==', member_id]]);
    const { balance: currentBalance } = calcBalance(existing);
    const newBalance = type === 'penalty'
      ? currentBalance - parseFloat(amount)
      : currentBalance + parseFloat(amount);

    const id = await add('savings', {
      member_id, amount: parseFloat(amount), type,
      description: description || null,
      transaction_date: transaction_date || new Date().toISOString().split('T')[0],
      balance_after: newBalance,
      created_by: req.user.id
    });

    res.status(201).json({ id, balance_after: newBalance, message: 'Transasaun rejista ho susesu' });
  } catch (err) {
    console.error('Savings error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
