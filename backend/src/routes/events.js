const express = require('express');
const { body, query: qv, validationResult } = require('express-validator');
const { query } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { dispatchEvent, previewRecipients } = require('../services/notificationService');

const router = express.Router();

// GET /api/events — paginated list for current user's city/state
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, city_filter } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { state, city } = req.user;

  // Users see events targeted at their city, their state, or all
  const result = await query(
    `SELECT e.id, e.title, e.body, e.event_type, e.target_scope,
            e.target_state, e.target_city, e.target_role,
            e.recipients_count, e.sent_at, e.created_at,
            u.handle as author_handle,
            nl.status as my_status, nl.read_at
     FROM events e
     JOIN users u ON u.id = e.created_by
     LEFT JOIN notification_log nl ON nl.event_id = e.id AND nl.user_id = $1 AND nl.channel = 'inapp'
     WHERE e.is_draft = false AND e.sent_at IS NOT NULL
       AND (
         (e.target_scope = 'all')
         OR (e.target_scope = 'state' AND LOWER(e.target_state) = LOWER($2))
         OR (e.target_scope = 'city' AND LOWER(e.target_state) = LOWER($2) AND LOWER(e.target_city) = LOWER($3))
       )
     ORDER BY e.created_at DESC
     LIMIT $4 OFFSET $5`,
    [req.user.id, state, city, parseInt(limit), offset]
  );

  res.json({ events: result.rows, page: parseInt(page) });
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res) => {
  const result = await query(
    `SELECT e.*, u.handle as author_handle FROM events e
     JOIN users u ON u.id = e.created_by WHERE e.id = $1`,
    [req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });

  // Mark as read
  await query(
    `UPDATE notification_log SET status = 'read', read_at = NOW()
     WHERE event_id = $1 AND user_id = $2 AND channel = 'inapp'`,
    [req.params.id, req.user.id]
  );

  res.json(result.rows[0]);
});

// POST /api/events — admin creates event
router.post('/', authenticate, requireAdmin, [
  body('title').notEmpty().trim().isLength({ max: 255 }),
  body('body').notEmpty().trim(),
  body('event_type').isIn(['general', 'urgent', 'quiz', 'exam', 'holiday', 'other']),
  body('target_scope').isIn(['city', 'state', 'all']),
  body('target_state').optional().trim(),
  body('target_city').optional().trim(),
  body('target_role').optional().isIn(['teacher', 'student', 'all']),
  body('is_draft').optional().isBoolean(),
  body('send_now').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, body: bodyText, event_type, target_scope, target_state,
          target_city, target_role = 'all', is_draft = false, send_now = false } = req.body;

  try {
    const result = await query(
      `INSERT INTO events (title, body, event_type, target_scope, target_state, target_city, target_role, created_by, is_draft)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, bodyText, event_type, target_scope, target_state, target_city, target_role, req.user.id, is_draft]
    );
    const event = result.rows[0];

    if (!is_draft && send_now) {
      // Dispatch in background
      dispatchEvent(event.id).catch(err => console.error('Dispatch error:', err));
    }

    res.status(201).json({ event, dispatching: send_now && !is_draft });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// POST /api/events/:id/send — admin sends a draft
router.post('/:id/send', authenticate, requireAdmin, async (req, res) => {
  const eventRes = await query('SELECT * FROM events WHERE id = $1 AND created_by = $2', [req.params.id, req.user.id]);
  if (!eventRes.rows.length) return res.status(404).json({ error: 'Event not found' });

  try {
    const results = await dispatchEvent(req.params.id);
    res.json({ success: true, delivery: results });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: 'Dispatch failed' });
  }
});

// POST /api/events/preview — preview recipient counts without sending
router.post('/preview', authenticate, requireAdmin, async (req, res) => {
  const { target_scope, target_state, target_city, target_role = 'all' } = req.body;
  try {
    const preview = await previewRecipients({ target_scope, target_state, target_city, target_role });
    res.json(preview);
  } catch (err) {
    res.status(500).json({ error: 'Preview failed' });
  }
});

// GET /api/events/admin/all — admin sees all events
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  const result = await query(
    `SELECT e.*, u.handle as author_handle FROM events e
     JOIN users u ON u.id = e.created_by
     ORDER BY e.created_at DESC LIMIT 100`
  );
  res.json({ events: result.rows });
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await query('DELETE FROM events WHERE id = $1 AND created_by = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});

module.exports = router;
