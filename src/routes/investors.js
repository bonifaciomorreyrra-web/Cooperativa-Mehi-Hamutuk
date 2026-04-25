'use strict';
const express = require('express');
const { findAll, getById, add, update, nextCounter } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin', 'president'));

router.get('/', async (req, res) => {
  try {
    const investors = await findAll('investors', [], 'created_at', true);
    res.json(investors);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const investor = await getById('investors', req.params.id);
    if (!investor) return res.status(404).json({ error: 'Investidor la hetan' });
    res.json(investor);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      full_name, bi_electoral_no, phone, email, investor_type = 'non-member',
      member_id, member_name, member_no, amount, start_date, end_date, frequency = 'one-time'
    } = req.body;

    if (!full_name || !amount) {
      return res.status(400).json({ error: 'Naran no montante obrigatóriu' });
    }
    if (investor_type === 'non-member' && parseFloat(amount) < 2000) {
      return res.status(400).json({ error: 'Investidor la-membru mínimo $2,000' });
    }

    const count = await nextCounter('investorCount');
    const investor_no = `MH-IN-${String(count).padStart(3, '0')}`;

    const id = await add('investors', {
      investor_no, full_name, bi_electoral_no: bi_electoral_no || null,
      phone: phone || null, email: email || null,
      investor_type, member_id: member_id || null,
      member_name: member_name || null, member_no: member_no || null,
      amount: parseFloat(amount), start_date: start_date || null,
      end_date: end_date || null, frequency, status: 'pending', registration_fee: 5.00
    });

    res.status(201).json({ id, investor_no, message: 'Investidor rejistu ho susesu' });
  } catch (err) {
    console.error('Investor create error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { full_name, phone, email, amount, status } = req.body;
    const patch = {};
    if (full_name !== undefined) patch.full_name = full_name;
    if (phone !== undefined) patch.phone = phone;
    if (email !== undefined) patch.email = email;
    if (amount !== undefined) patch.amount = parseFloat(amount);
    if (status !== undefined) patch.status = status;
    await update('investors', req.params.id, patch);
    res.json({ message: 'Investidor atualiza ho susesu' });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
