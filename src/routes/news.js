'use strict';
const router = require('express').Router();
const { findAll, getById, add, update, remove } = require('../db/firestore');
const { authenticate, authorize } = require('../middleware/auth');
const requireAdmin = authorize('admin', 'president');

// Public: get published posts
router.get('/', async (req, res) => {
  try {
    const all = await findAll('news', [['published', '==', true]]);
    const posts = all.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erru hetan notísias' });
  }
});

// Admin: get all posts (including drafts)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const all = await findAll('news');
    const posts = all.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Erru hetan notísias' });
  }
});

// Admin: create post
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, body, category, published } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Títulu no konteúdu obrigatóriu' });
    const id = await add('news', {
      title,
      body,
      category: category || 'news',
      published: published !== false,
      author_id: req.user.id,
      author_name: req.user.full_name || req.user.username,
    });
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erru kria post' });
  }
});

// Admin: update post
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await getById('news', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post la hetan' });
    const { title, body, category, published } = req.body;
    await update('news', req.params.id, {
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(category !== undefined && { category }),
      ...(published !== undefined && { published }),
      updated_at: new Date().toISOString(),
      updated_by: req.user.full_name || req.user.username,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erru atualiza post' });
  }
});

// Admin: delete post
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await remove('news', req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erru hamoos post' });
  }
});

module.exports = router;
