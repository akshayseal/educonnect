const express = require('express');
const { query } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendBatchEmails } = require('../services/emailService');
const { decrypt } = require('../utils/crypto');

const router = express.Router();

// GET /api/events
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, state, city } = req.user;
    let sql = `
      SELECT e.*, u.handle as author_handle
      FROM events e
      JOIN users u ON u.id = e.created_by
      WHERE e.is_draft = false
        AND (e.target_role = 'all' OR e.target_role = $1)
        AND (
          e.target_scope = 'all'
          OR (e.target_scope = 'state' AND e.target_state = $2)
          OR (e.target_scope = 'city' AND e.target_state = $2 AND e.target_city = $3)
        )
      ORDER BY e.created_at DESC
    `;
    const result = await query(sql, [role, state, city]);
    res.json({ events: result.rows });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events (admin sees all)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.handle as author_handle FROM events e
       JOIN users u ON u.id = e.created_by
       ORDER BY e.created_at DESC`
    );
    res.json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events  (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, body, event_type, target_scope, target_state, target_city, target_role } = req.body;
    if (!title || !body || !target_scope) {
      return res.status(400).json({ error: 'title, body, and target_scope are required' });
    }

    const result = await query(
      `INSERT INTO events (title, body, event_type, target_scope, target_state, target_city, target_role, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [title, body, event_type || 'general', target_scope, target_state || null, target_city || null, target_role || 'all', req.user.id]
    );
    res.status(201).json({ event: result.rows[0] });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// POST /api/events/:id/send  (admin only - sends notifications)
router.post('/:id/send', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [id]);
    if (!eventRes.rows.length) return res.status(404).json({ error: 'Event not found' });
    const event = eventRes.rows[0];

    if (event.sent_at) return res.status(400).json({ error: 'Event already sent' });

    // Find matching users and their emails
    let userSql = `
      SELECT u.id, u.handle, u.role, uc.email_encrypted
      FROM users u
      LEFT JOIN user_contacts uc ON uc.user_id = u.id
      WHERE u.is_active = true
        AND (u.role != 'admin')
        AND ($1 = 'all' OR u.role = $1)
        AND (
          $2 = 'all'
          OR ($2 = 'state' AND u.state = $3)
          OR ($2 = 'city' AND u.state = $3 AND u.city = $4)
        )
    `;
    const users = await query(userSql, [
      event.target_role || 'all',
      event.target_scope,
      event.target_state || '',
      event.target_city || '',
    ]);

    const recipients = users.rows
      .map(u => ({ ...u, email: decrypt(u.email_encrypted) }))
      .filter(u => u.email);

    // Send emails
    let sent = 0, failed = 0;
    if (recipients.length > 0 && process.env.SENDGRID_API_KEY) {
      const adminRes = await query('SELECT handle FROM users WHERE id = $1', [req.user.id]);
      const eventWithAuthor = { ...event, author_handle: adminRes.rows[0]?.handle };
      const result = await sendBatchEmails(recipients, eventWithAuthor);
      sent = result.sent;
      failed = result.failed;
    }

    // Mark as sent
    await query(
      'UPDATE events SET sent_at = NOW(), recipients_count = $1, is_draft = false WHERE id = $2',
      [recipients.length, id]
    );

    // Log notifications
    for (const u of users.rows) {
      await query(
        `INSERT INTO notification_log (event_id, user_id, channel, status, sent_at)
         VALUES ($1, $2, 'email', $3, NOW())
         ON CONFLICT (event_id, user_id, channel) DO NOTHING`,
        [id, u.id, sent > 0 ? 'sent' : 'pending']
      );
    }

    res.json({
      message: 'Event sent',
      recipients_count: recipients.length,
      emails_sent: sent,
      emails_failed: failed,
    });
  } catch (err) {
    console.error('Send event error:', err);
    res.status(500).json({ error: 'Failed to send event' });
  }
});

// DELETE /api/events/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM events WHERE id = $1 AND sent_at IS NULL RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found or already sent' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
