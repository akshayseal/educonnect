const express = require('express');
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — user's notification inbox
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const result = await query(
    `SELECT nl.id, nl.channel, nl.status, nl.sent_at, nl.read_at,
            e.id as event_id, e.title, e.event_type, e.target_city,
            e.target_state, e.target_scope, u.handle as author_handle
     FROM notification_log nl
     JOIN events e ON e.id = nl.event_id
     JOIN users u ON u.id = e.created_by
     WHERE nl.user_id = $1
     ORDER BY nl.sent_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, parseInt(limit), offset]
  );

  const unreadCount = await query(
    `SELECT COUNT(*) FROM notification_log
     WHERE user_id = $1 AND status = 'sent' AND channel = 'inapp'`,
    [req.user.id]
  );

  res.json({
    notifications: result.rows,
    unread: parseInt(unreadCount.rows[0].count),
    page: parseInt(page),
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  await query(
    `UPDATE notification_log SET status = 'read', read_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  await query(
    `UPDATE notification_log SET status = 'read', read_at = NOW()
     WHERE user_id = $1 AND status = 'sent'`,
    [req.user.id]
  );
  res.json({ success: true });
});

// GET /api/notifications/stats — for admin dashboard
router.get('/stats', authenticate, async (req, res) => {
  const totalUsers = await query(`SELECT COUNT(*) FROM users WHERE is_active = true AND role != 'admin'`);
  const totalEvents = await query(`SELECT COUNT(*) FROM events WHERE sent_at IS NOT NULL`);
  const totalSent = await query(`SELECT COUNT(*) FROM notification_log WHERE status IN ('sent','read')`);
  const byCity = await query(
    `SELECT city, COUNT(*) as members FROM users WHERE is_active = true GROUP BY city ORDER BY members DESC LIMIT 10`
  );

  res.json({
    total_users: parseInt(totalUsers.rows[0].count),
    total_events: parseInt(totalEvents.rows[0].count),
    total_sent: parseInt(totalSent.rows[0].count),
    members_by_city: byCity.rows,
  });
});

module.exports = router;
