'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { findOne, findAll, getById, add, set, update, remove, nextCounter } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// GET /api/members/me
router.get('/me', async (req, res) => {
  try {
    const member = await findOne('members', [['user_id', '==', req.user.id]]);
    if (!member) return res.status(404).json({ error: 'Membru la hetan' });
    res.json({ ...member, username: req.user.username, role: req.user.role });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/members
router.get('/', authorize('admin', 'president'), async (req, res) => {
  try {
    const { search, status, type } = req.query;
    let members = await findAll('members', [], 'member_no');

    if (search) {
      const s = search.toLowerCase();
      members = members.filter(m =>
        m.full_name?.toLowerCase().includes(s) ||
        m.member_no?.toLowerCase().includes(s) ||
        m.phone?.includes(s)
      );
    }
    if (status) members = members.filter(m => m.status === status);
    if (type) members = members.filter(m => m.member_type === type);

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// GET /api/members/:id
router.get('/:id', async (req, res) => {
  try {
    const member = await getById('members', req.params.id);
    if (!member) return res.status(404).json({ error: 'Membru la hetan' });
    if (req.user.role === 'member' && member.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Laiha permisaun' });
    }
    res.json({ ...member, username: req.user.username, role: req.user.role });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// POST /api/members
router.post('/', authorize('admin', 'president'), async (req, res) => {
  try {
    const {
      username, password = 'member123',
      full_name, bi_electoral_no, date_of_birth, place_of_birth,
      profession, address, phone, email, member_type = 'employee', joined_date
    } = req.body;

    if (!full_name || !username) {
      return res.status(400).json({ error: 'Naran kompletu no username obrigatóriu' });
    }

    const existing = await findOne('users', [['username', '==', username]]);
    if (existing) return res.status(400).json({ error: 'Username uza ona' });

    const hash = bcrypt.hashSync(password, 10);
    const userId = await add('users', { username, password_hash: hash, role: 'member', is_active: true });

    const count = await nextCounter('memberCount');
    const member_no = `MH-${String(count).padStart(4, '0')}`;

    const memberId = await add('members', {
      user_id: userId, member_no, full_name, bi_electoral_no: bi_electoral_no || null,
      date_of_birth: date_of_birth || null, place_of_birth: place_of_birth || null,
      profession: profession || null, address: address || null, phone: phone || null,
      email: email || null, member_type, photo_url: null,
      joined_date: joined_date || new Date().toISOString().split('T')[0], status: 'active'
    });

    res.status(201).json({ id: memberId, member_no, message: 'Membru rejistu ho susesu' });
  } catch (err) {
    console.error('Create member error:', err);
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// PUT /api/members/:id
router.put('/:id', async (req, res) => {
  try {
    const member = await getById('members', req.params.id);
    if (!member) return res.status(404).json({ error: 'Membru la hetan' });
    if (req.user.role === 'member' && member.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Laiha permisaun' });
    }

    const { full_name, bi_electoral_no, date_of_birth, place_of_birth,
      profession, address, phone, email, member_type, status, photo_url } = req.body;

    const patch = {};
    if (full_name !== undefined) patch.full_name = full_name;
    if (bi_electoral_no !== undefined) patch.bi_electoral_no = bi_electoral_no;
    if (date_of_birth !== undefined) patch.date_of_birth = date_of_birth;
    if (place_of_birth !== undefined) patch.place_of_birth = place_of_birth;
    if (profession !== undefined) patch.profession = profession;
    if (address !== undefined) patch.address = address;
    if (phone !== undefined) patch.phone = phone;
    if (email !== undefined) patch.email = email;
    if (member_type !== undefined) patch.member_type = member_type;
    if (status !== undefined && req.user.role !== 'member') patch.status = status;
    if (photo_url !== undefined) patch.photo_url = photo_url;

    await update('members', req.params.id, patch);
    res.json({ message: 'Dadus membru atualiza ho susesu' });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

// POST /api/members/:id/photo  (multipart upload)
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const member = await getById('members', req.params.id);
    if (!member) return res.status(404).json({ error: 'Membru la hetan' });
    if (req.user.role === 'member' && member.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Laiha permisaun' });
    }
    if (!req.file) return res.status(400).json({ error: 'Foto obrigatóriu' });

    const admin = require('firebase-admin');
    const bucket = admin.storage().bucket();
    const ext = req.file.mimetype.split('/')[1] || 'jpg';
    const filename = `photos/${req.params.id}_${Date.now()}.${ext}`;
    const fileRef = bucket.file(filename);

    await fileRef.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: { cacheControl: 'public, max-age=31536000' }
    });
    await fileRef.makePublic();

    const photo_url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    await update('members', req.params.id, { photo_url });
    res.json({ photo_url });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: 'Erru upload foto' });
  }
});

// DELETE /api/members/:id (deactivate)
router.delete('/:id', authorize('admin', 'president'), async (req, res) => {
  try {
    const member = await getById('members', req.params.id);
    if (!member) return res.status(404).json({ error: 'Membru la hetan' });
    await update('members', req.params.id, { status: 'inactive' });
    await update('users', member.user_id, { is_active: false });
    res.json({ message: 'Membru deativa ho susesu' });
  } catch (err) {
    res.status(500).json({ error: 'Erru iha servidor' });
  }
});

module.exports = router;
