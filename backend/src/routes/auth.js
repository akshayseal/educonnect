const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../models/db');
const { encrypt, generateHandle } = require('../utils/crypto');
const { signToken, authenticate } = require('../middleware/auth');

const router = express.Router();

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir',
  'Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli','Daman and Diu','Lakshadweep'
];

// POST /api/auth/register
router.post('/register', [
  body('role').isIn(['teacher', 'student', 'admin']),
  body('state').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('password').isLength({ min: 8 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('whatsapp').optional().matches(/^\+?[0-9]{10,15}$/),
  body('school_name').optional().trim(),
  body('notify_email').optional().isBoolean(),
  body('notify_whatsapp').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { role, state, city, password, email, whatsapp, school_name,
          notify_email = true, notify_whatsapp = false, admin_secret } = req.body;

  // Admin requires secret code
  if (role === 'admin' && admin_secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin registration code' });
  }

  try {
    // Generate unique handle
    let handle, attempts = 0;
    do {
      handle = generateHandle(role);
      const exists = await query('SELECT id FROM users WHERE handle = $1', [handle]);
      if (!exists.rows.length) break;
      attempts++;
    } while (attempts < 10);

    const password_hash = await bcrypt.hash(password, 12);

    // Insert user (no personal info)
    const userRes = await query(
      `INSERT INTO users (handle, role, state, city, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, handle, role, state, city`,
      [handle, role, state.trim(), city.trim(), password_hash]
    );
    const user = userRes.rows[0];

    // Encrypt and store contacts separately
    await query(
      `INSERT INTO user_contacts (user_id, email_encrypted, whatsapp_encrypted, school_name_encrypted, notify_email, notify_whatsapp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, encrypt(email), encrypt(whatsapp), encrypt(school_name), notify_email, notify_whatsapp]
    );

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user: { id: user.id, handle, role, state: user.state, city: user.city } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Handle collision, please try again' });
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('handle').notEmpty().trim(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { handle, password } = req.body;
  try {
    const result = await query(
      'SELECT id, handle, role, state, city, password_hash, is_active FROM users WHERE handle = $1',
      [handle.trim()]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token, user: { id: user.id, handle: user.handle, role: user.role, state: user.state, city: user.city } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { id, handle, role, state, city } = req.user;
  // Fetch contact prefs (not the encrypted values)
  const prefs = await query(
    'SELECT notify_email, notify_whatsapp, notify_sms FROM user_contacts WHERE user_id = $1',
    [id]
  );
  const p = prefs.rows[0] || {};
  res.json({ id, handle, role, state, city, notify_email: p.notify_email, notify_whatsapp: p.notify_whatsapp });
});

// PUT /api/auth/preferences
router.put('/preferences', authenticate, [
  body('notify_email').optional().isBoolean(),
  body('notify_whatsapp').optional().isBoolean(),
  body('email').optional().isEmail().normalizeEmail(),
  body('whatsapp').optional().matches(/^\+?[0-9]{10,15}$/),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { notify_email, notify_whatsapp, email, whatsapp, school_name } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (notify_email !== undefined) { updates.push(`notify_email = $${idx++}`); params.push(notify_email); }
  if (notify_whatsapp !== undefined) { updates.push(`notify_whatsapp = $${idx++}`); params.push(notify_whatsapp); }
  if (email) { updates.push(`email_encrypted = $${idx++}`); params.push(encrypt(email)); }
  if (whatsapp) { updates.push(`whatsapp_encrypted = $${idx++}`); params.push(encrypt(whatsapp)); }
  if (school_name) { updates.push(`school_name_encrypted = $${idx++}`); params.push(encrypt(school_name)); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.user.id);
  await query(`UPDATE user_contacts SET ${updates.join(', ')} WHERE user_id = $${idx}`, params);
  res.json({ success: true });
});

// DELETE /api/auth/account
router.delete('/account', authenticate, async (req, res) => {
  // Soft delete + purge contacts
  await query('UPDATE users SET is_active = false WHERE id = $1', [req.user.id]);
  await query('UPDATE user_contacts SET email_encrypted = NULL, whatsapp_encrypted = NULL, school_name_encrypted = NULL WHERE user_id = $1', [req.user.id]);
  res.json({ success: true, message: 'Account deactivated and contact data purged' });
});

module.exports = router;
