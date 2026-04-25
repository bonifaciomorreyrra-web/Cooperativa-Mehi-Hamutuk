'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findOne, getById, update } = require('../db/firestore');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username no password obrigatóriu' });
    }

    const user = await findOne('users', [['username', '==', username], ['is_active', '==', true]]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Username ka password sala' });
    }

    const member = await findOne('members', [['user_id', '==', user.id]]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, memberId: member?.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
      member: member ? {
        id: member.id, member_no: member.member_no, full_name: member.full_name,
        photo_url: member.photo_url || null, status: member.status
      } : null
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logout ho susesu' });
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await getById('users', req.user.id);

    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Password atual sala' });
    }
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password foun mínimo 6 karakter' });
    }

    await update('users', user.id, { password_hash: bcrypt.hashSync(new_password, 10) });
    res.json({ message: 'Password muda ho susesu' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
