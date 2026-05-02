const twilio = require('twilio');
require('dotenv').config();

let client;
try {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} catch {
  console.warn('Twilio not configured — WhatsApp notifications disabled');
}

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

/**
 * Format a WhatsApp message for an event
 */
function formatWhatsAppMessage(event) {
  const typeEmoji = {
    urgent: '🔴',
    quiz: '📝',
    exam: '📋',
    general: '📢',
    holiday: '🎉',
    other: '📌',
  };
  const emoji = typeEmoji[event.event_type] || '📢';
  const scopeLabel = event.target_city
    ? `${event.target_city}, ${event.target_state}`
    : event.target_state || 'All India';

  return `${emoji} *EduConnect — ${scopeLabel}*\n\n*${event.title}*\n\n${event.body}\n\n_Posted by ${event.author_handle}_`;
}

/**
 * Send WhatsApp message to a single number
 */
async function sendWhatsAppMessage({ toNumber, event }) {
  if (!client) throw new Error('Twilio not configured');

  const to = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
  const body = formatWhatsAppMessage(event);

  return client.messages.create({ from: FROM, to, body });
}

/**
 * Send WhatsApp to multiple recipients
 */
async function sendBatchWhatsApp(recipients, event) {
  if (!client || !recipients.length) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  // Twilio doesn't support bulk; send with concurrency limit
  const CONCURRENCY = 10;
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(r => sendWhatsAppMessage({ toNumber: r.whatsapp, event }))
    );
    results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);
    // Small delay between batches to avoid rate limits
    if (i + CONCURRENCY < recipients.length) await new Promise(r => setTimeout(r, 200));
  }
  return { sent, failed };
}

module.exports = { sendWhatsAppMessage, sendBatchWhatsApp };
