const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@educonnect.app',
  name: process.env.SENDGRID_FROM_NAME || 'EduConnect',
};

/**
 * Send a single event notification email
 */
async function sendEventEmail({ toEmail, toHandle, event }) {
  const typeColors = {
    urgent: '#E24B4A',
    quiz: '#185FA5',
    exam: '#854F0B',
    general: '#1D9E75',
    holiday: '#533AB7',
    other: '#5F5E5A',
  };
  const color = typeColors[event.event_type] || typeColors.general;
  const scopeLabel = event.target_city
    ? `${event.target_city}, ${event.target_state}`
    : event.target_state || 'All India';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Georgia,serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e0ddd6;">
    <div style="background:${color};padding:24px 32px;">
      <div style="color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
        EduConnect · ${scopeLabel}
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:normal;line-height:1.3;">${event.title}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#333;font-size:16px;line-height:1.7;margin:0 0 24px;">${event.body.replace(/\n/g, '<br>')}</p>
      <div style="border-top:1px solid #e0ddd6;padding-top:16px;font-size:13px;color:#888;">
        <span style="display:inline-block;background:#f1efe8;padding:4px 12px;border-radius:20px;">
          Posted by ${event.author_handle} · ${new Date(event.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
    <div style="background:#f5f5f0;padding:20px 32px;font-size:12px;color:#999;border-top:1px solid #e0ddd6;">
      You received this because you are a member of EduConnect in ${scopeLabel}.<br>
      Your identity (${toHandle}) is anonymous within the community.<br>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings" style="color:#185FA5;">Manage notification preferences</a>
    </div>
  </div>
</body>
</html>`;

  const msg = {
    to: toEmail,
    from: FROM,
    subject: `[EduConnect${event.event_type === 'urgent' ? ' 🔴 URGENT' : ''}] ${event.title}`,
    html,
    text: `${event.title}\n\n${event.body}\n\nPosted by ${event.author_handle}\nLocation: ${scopeLabel}\n\nManage preferences: ${process.env.FRONTEND_URL}/settings`,
  };

  await sgMail.send(msg);
}

/**
 * Send batch emails (uses SendGrid personalizations for efficiency)
 */
async function sendBatchEmails(recipients, event) {
  if (!recipients.length) return { sent: 0, failed: 0 };

  const BATCH_SIZE = 1000; // SendGrid limit per request
  let sent = 0, failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    try {
      const personalizations = batch.map(r => ({
        to: [{ email: r.email }],
      }));

      // For simplicity send individually; for scale use personalizations
      const promises = batch.map(r => sendEventEmail({ toEmail: r.email, toHandle: r.handle, event }));
      const results = await Promise.allSettled(promises);
      results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);
    } catch (err) {
      failed += batch.length;
      console.error('Batch email error:', err.message);
    }
  }
  return { sent, failed };
}

module.exports = { sendEventEmail, sendBatchEmails };
