const { query, getClient } = require('../models/db');
const { decrypt } = require('../utils/crypto');
const { sendBatchEmails } = require('./emailService');
const { sendBatchWhatsApp } = require('./whatsappService');

/**
 * Resolve which users should receive an event notification
 * based on target_scope, target_state, target_city, target_role
 */
async function resolveRecipients(event) {
  let sql = `
    SELECT u.id, u.handle, u.state, u.city, u.role,
           uc.email_encrypted, uc.whatsapp_encrypted,
           uc.notify_email, uc.notify_whatsapp
    FROM users u
    JOIN user_contacts uc ON uc.user_id = u.id
    WHERE u.is_active = true AND u.role != 'admin'
  `;
  const params = [];
  let idx = 1;

  // Location filtering
  if (event.target_scope === 'city' && event.target_city && event.target_state) {
    sql += ` AND LOWER(u.state) = LOWER($${idx++}) AND LOWER(u.city) = LOWER($${idx++})`;
    params.push(event.target_state, event.target_city);
  } else if (event.target_scope === 'state' && event.target_state) {
    sql += ` AND LOWER(u.state) = LOWER($${idx++})`;
    params.push(event.target_state);
  }
  // scope 'all' — no location filter

  // Role filtering
  if (event.target_role && event.target_role !== 'all') {
    sql += ` AND u.role = $${idx++}`;
    params.push(event.target_role);
  }

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Main dispatch function — sends notifications and logs delivery
 */
async function dispatchEvent(eventId) {
  // Fetch the event
  const eventRes = await query(
    `SELECT e.*, u.handle as author_handle
     FROM events e JOIN users u ON u.id = e.created_by
     WHERE e.id = $1`,
    [eventId]
  );
  if (!eventRes.rows.length) throw new Error('Event not found');
  const event = eventRes.rows[0];

  // Resolve recipients
  const rawRecipients = await resolveRecipients(event);

  // Separate by channel, decrypting contact info
  const emailRecipients = [];
  const whatsappRecipients = [];
  const inappRecipients = [];

  for (const r of rawRecipients) {
    inappRecipients.push(r); // always in-app

    if (r.notify_email && r.email_encrypted) {
      const email = decrypt(r.email_encrypted);
      if (email) emailRecipients.push({ ...r, email });
    }
    if (r.notify_whatsapp && r.whatsapp_encrypted) {
      const whatsapp = decrypt(r.whatsapp_encrypted);
      if (whatsapp) whatsappRecipients.push({ ...r, whatsapp });
    }
  }

  // Insert in-app notification logs
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Bulk insert in-app notifications
    if (inappRecipients.length) {
      const values = inappRecipients.map((_, i) => `($1, $${i * 2 + 2}, 'inapp', 'sent', NOW())`).join(',');
      const params = [eventId, ...inappRecipients.flatMap(r => [r.id])];
      // Rebuild properly for pg
      const inAppSql = `
        INSERT INTO notification_log (event_id, user_id, channel, status, sent_at)
        VALUES ${inappRecipients.map((_, i) => `($1, $${i + 2}, 'inapp', 'sent', NOW())`).join(',')}
        ON CONFLICT (event_id, user_id, channel) DO NOTHING
      `;
      await client.query(inAppSql, [eventId, ...inappRecipients.map(r => r.id)]);
    }

    // Update event metadata
    await client.query(
      `UPDATE events SET sent_at = NOW(), recipients_count = $1 WHERE id = $2`,
      [rawRecipients.length, eventId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Send async (don't block response)
  const results = { inapp: inappRecipients.length, email: 0, whatsapp: 0, failed: 0 };

  const [emailResult, waResult] = await Promise.allSettled([
    sendBatchEmails(emailRecipients, event),
    sendBatchWhatsApp(whatsappRecipients, event),
  ]);

  if (emailResult.status === 'fulfilled') {
    results.email = emailResult.value.sent;
    results.failed += emailResult.value.failed;
  }
  if (waResult.status === 'fulfilled') {
    results.whatsapp = waResult.value.sent;
    results.failed += waResult.value.failed;
  }

  // Log email/whatsapp delivery status
  await logDeliveries(eventId, emailRecipients, 'email', 'sent');
  await logDeliveries(eventId, whatsappRecipients, 'whatsapp', 'sent');

  return results;
}

async function logDeliveries(eventId, recipients, channel, status) {
  if (!recipients.length) return;
  const sql = `
    INSERT INTO notification_log (event_id, user_id, channel, status, sent_at)
    VALUES ${recipients.map((_, i) => `($1, $${i + 2}, $${recipients.length + 2}, $${recipients.length + 3}, NOW())`).join(',')}
    ON CONFLICT (event_id, user_id, channel) DO UPDATE SET status = EXCLUDED.status, sent_at = EXCLUDED.sent_at
  `;
  await query(sql, [eventId, ...recipients.map(r => r.id), channel, status]);
}

/**
 * Preview recipient count without sending
 */
async function previewRecipients(eventData) {
  const recipients = await resolveRecipients(eventData);
  const emailCount = recipients.filter(r => r.notify_email && r.email_encrypted).length;
  const waCount = recipients.filter(r => r.notify_whatsapp && r.whatsapp_encrypted).length;
  return {
    total: recipients.length,
    by_channel: { email: emailCount, whatsapp: waCount, inapp: recipients.length },
    by_role: {
      teachers: recipients.filter(r => r.role === 'teacher').length,
      students: recipients.filter(r => r.role === 'student').length,
    },
  };
}

module.exports = { dispatchEvent, previewRecipients };
