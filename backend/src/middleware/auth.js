const jwt = require('jsonwebtoken');
const { query } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await query('SELECT id, handle, role, state, city, is_active FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { signToken, authenticate, requireAdmin };
