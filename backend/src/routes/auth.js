const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { signToken, authenticate, requireAdmin } = require('../middleware/auth');
const { encrypt, generateHandle } = require('../utils/crypto');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { role, state, city, password, email, adminSecret } = req.body;

    if (!role || !state || !city || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['teacher', 'student', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (role === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret' });
      }
    }

    const handle = generateHandle(role);
    const password_hash = await bcrypt.hash(password, 12);
    const emailEncrypted = encrypt(email);

    const result = await query(
      `INSERT INTO users (handle, role, state, city, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, handle, role, state, city, created_at`,
      [handle, role, state, city, password_hash]
    );
    const user = result.rows[0];

    // Save encrypted contact info
    await query(
      `INSERT INTO user_contacts (user_id, email_encrypted) VALUES ($1, $2)`,
      [user.id, emailEncrypted]
    );

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { handle, password } = req.body;
    if (!handle || !password) {
      return res.status(400).json({ error: 'Handle and password required' });
    }

    const result = await query(
      'SELECT * FROM users WHERE handle = $1 AND is_active = true',
      [handle]
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid handle or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid handle or password' });
    }

    const token = signToken({ id: user.id, role: user.role });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users  (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role, state, city } = req.query;
    let sql = 'SELECT id, handle, role, state, city, is_active, is_verified, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) { params.push(role); sql += ` AND role = $${params.length}`; }
    if (state) { params.push(state); sql += ` AND state = $${params.length}`; }
    if (city) { params.push(city); sql += ` AND city ILIKE $${params.length}`; }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/auth/users/:id/toggle  (admin only)
router.patch('/users/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, handle, is_active',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user' });
  }
});

module.exports = router;
