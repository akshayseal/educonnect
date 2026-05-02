const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { query } = require('../models/db');
const { signToken, authenticate, requireAdmin } = require('../middleware/auth');
const { encrypt, decrypt, generateHandle } = require('../utils/crypto');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { role, state, city, password, email, whatsapp, schoolName, adminSecret, subject, qualification, experienceYears, classGrade, section, rollNumber } = req.body;

    if (!role || !state || !city || !password || !email) return res.status(400).json({ error: 'All fields are required' });
    if (!['teacher', 'student', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (role === 'admin' && (!adminSecret || adminSecret !== process.env.ADMIN_SECRET)) return res.status(403).json({ error: 'Invalid admin secret' });
    if ((role === 'teacher' || role === 'student') && !schoolName) return res.status(400).json({ error: 'School name is required' });

    const handle = generateHandle(role);
    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (handle, role, state, city, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, handle, role, state, city, created_at`,
      [handle, role, state, city, password_hash]
    );
    const user = result.rows[0];

    await query(
      `INSERT INTO user_contacts (user_id, email_encrypted, whatsapp_encrypted, school_name_encrypted, notify_email, notify_whatsapp)
       VALUES ($1,$2,$3,$4,true,$5)`,
      [user.id, encrypt(email), encrypt(whatsapp || null), encrypt(schoolName || null), !!whatsapp]
    );

    if (role === 'teacher') {
      await query(`INSERT INTO teacher_profiles (user_id, school_name, subject, qualification, experience_years) VALUES ($1,$2,$3,$4,$5)`,
        [user.id, schoolName, subject || null, qualification || null, experienceYears || null]);
    } else if (role === 'student') {
      await query(`INSERT INTO student_profiles (user_id, school_name, class_grade, section, roll_number) VALUES ($1,$2,$3,$4,$5)`,
        [user.id, schoolName, classGrade || null, section || null, rollNumber || null]);
    }

    try { await sendWelcomeEmail({ toEmail: email, handle, role }); } catch (e) { console.error('Welcome email failed:', e.message); }

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { handle, password } = req.body;
    if (!handle || !password) return res.status(400).json({ error: 'Handle and password required' });
    const result = await query('SELECT * FROM users WHERE handle = $1 AND is_active = true', [handle]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid handle or password' });
    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid handle or password' });
    const token = signToken({ id: user.id, role: user.role });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { res.status(500).json({ error: 'Login failed' }); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => res.json({ user: req.user }));

// GET /api/auth/users (admin - with decrypted contacts)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role, state, city } = req.query;
    let sql = `
      SELECT u.id, u.handle, u.role, u.state, u.city, u.is_active, u.is_verified, u.created_at,
             uc.email_encrypted, uc.whatsapp_encrypted,
             COALESCE(tp.school_name, sp.school_name) as school_name,
             tp.subject, tp.qualification, tp.experience_years,
             sp.class_grade, sp.section, sp.roll_number
      FROM users u
      LEFT JOIN user_contacts uc ON uc.user_id = u.id
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (role) { params.push(role); sql += ` AND u.role = $${params.length}`; }
    if (state) { params.push(state); sql += ` AND u.state = $${params.length}`; }
    if (city) { params.push(city); sql += ` AND u.city ILIKE $${params.length}`; }
    sql += ' ORDER BY u.created_at DESC';
    const result = await query(sql, params);
    const users = result.rows.map(u => ({ ...u, email: decrypt(u.email_encrypted), whatsapp: decrypt(u.whatsapp_encrypted), email_encrypted: undefined, whatsapp_encrypted: undefined }));
    res.json({ users });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

// GET /api/auth/users/export (CSV download)
router.get('/users/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    let sql = `
      SELECT u.handle, u.role, u.state, u.city, u.is_active, u.created_at,
             uc.email_encrypted, uc.whatsapp_encrypted,
             COALESCE(tp.school_name, sp.school_name) as school_name,
             tp.subject, tp.qualification, tp.experience_years,
             sp.class_grade, sp.section, sp.roll_number
      FROM users u
      LEFT JOIN user_contacts uc ON uc.user_id = u.id
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role != 'admin'`;
    const params = [];
    if (role && role !== 'all') { params.push(role); sql += ` AND u.role = $${params.length}`; }
    sql += ' ORDER BY u.role, u.state, u.city';
    const result = await query(sql, params);

    let csv = '';
    const teachers = result.rows.filter(r => r.role === 'teacher');
    const students = result.rows.filter(r => r.role === 'student');
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

    if (!role || role === 'all' || role === 'teacher') {
      csv += 'TEACHERS\nHandle,Email,WhatsApp,School,Subject,Qualification,Experience Years,State,City,Active,Joined\n';
      teachers.forEach(r => { csv += [r.handle, decrypt(r.email_encrypted)||'', decrypt(r.whatsapp_encrypted)||'', r.school_name||'', r.subject||'', r.qualification||'', r.experience_years||'', r.state, r.city, r.is_active?'Yes':'No', new Date(r.created_at).toLocaleDateString('en-IN')].map(q).join(',') + '\n'; });
      csv += '\n';
    }
    if (!role || role === 'all' || role === 'student') {
      csv += 'STUDENTS\nHandle,Email,WhatsApp,School,Class,Section,Roll Number,State,City,Active,Joined\n';
      students.forEach(r => { csv += [r.handle, decrypt(r.email_encrypted)||'', decrypt(r.whatsapp_encrypted)||'', r.school_name||'', r.class_grade||'', r.section||'', r.roll_number||'', r.state, r.city, r.is_active?'Yes':'No', new Date(r.created_at).toLocaleDateString('en-IN')].map(q).join(',') + '\n'; });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="educonnect-${role||'all'}-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) { console.error('Export error:', err); res.status(500).json({ error: 'Export failed' }); }
});

// POST /api/auth/bulk-create (CSV upload)
router.post('/bulk-create', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
    const records = parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, trim: true });
    if (!records.length) return res.status(400).json({ error: 'CSV is empty' });

    const defaultPassword = req.body.defaultPassword || 'EduConnect@2026';
    const results = { created: [], failed: [] };

    for (const row of records) {
      try {
        const role = (row.role || row.Role || '').toLowerCase().trim();
        const email = row.email || row.Email || '';
        const state = row.state || row.State || '';
        const city = row.city || row.City || '';
        const schoolName = row.school_name || row.school || row.School || '';
        const whatsapp = row.whatsapp || row.WhatsApp || '';

        if (!role || !email || !state || !city) { results.failed.push({ email, reason: 'Missing: role, email, state, or city' }); continue; }
        if (!['teacher', 'student'].includes(role)) { results.failed.push({ email, reason: 'Role must be teacher or student' }); continue; }

        const handle = generateHandle(role);
        const password_hash = await bcrypt.hash(defaultPassword, 12);
        const userResult = await query(`INSERT INTO users (handle, role, state, city, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, handle, role`, [handle, role, state, city, password_hash]);
        const user = userResult.rows[0];

        await query(`INSERT INTO user_contacts (user_id, email_encrypted, whatsapp_encrypted, school_name_encrypted, notify_email, notify_whatsapp) VALUES ($1,$2,$3,$4,true,$5)`,
          [user.id, encrypt(email), encrypt(whatsapp||null), encrypt(schoolName||null), !!whatsapp]);

        if (role === 'teacher') {
          await query(`INSERT INTO teacher_profiles (user_id, school_name, subject, qualification, experience_years) VALUES ($1,$2,$3,$4,$5)`,
            [user.id, schoolName, row.subject||null, row.qualification||null, row.experience_years||null]);
        } else {
          await query(`INSERT INTO student_profiles (user_id, school_name, class_grade, section, roll_number) VALUES ($1,$2,$3,$4,$5)`,
            [user.id, schoolName, row.class_grade||row.class||null, row.section||null, row.roll_number||null]);
        }

        try { await sendWelcomeEmail({ toEmail: email, handle, role, defaultPassword }); } catch (e) { console.error('Email failed:', e.message); }
        results.created.push({ handle, email, role });
      } catch (rowErr) { results.failed.push({ row: JSON.stringify(row), reason: rowErr.message }); }
    }

    res.json({ message: `Created ${results.created.length}, failed ${results.failed.length}`, created: results.created, failed: results.failed });
  } catch (err) { console.error('Bulk create error:', err); res.status(500).json({ error: 'Bulk create failed: ' + err.message }); }
});

// PATCH /api/auth/users/:id/toggle
router.patch('/users/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, handle, is_active', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to toggle user' }); }
});

module.exports = router;
