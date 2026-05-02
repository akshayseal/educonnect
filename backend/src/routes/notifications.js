const express = require('express');
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT nl.*, e.title, e.body, e.event_type
       FROM notification_log nl
       JOIN events e ON e.id = nl.event_id
       WHERE nl.user_id = $1
       ORDER BY nl.sent_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notification_log SET status = $1, read_at = NOW() WHERE id = $2 AND user_id = $3',
      ['read', req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;
