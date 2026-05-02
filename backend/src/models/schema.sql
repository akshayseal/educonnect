-- EduConnect Database Schema
-- Run: psql -U postgres -d educonnect -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────
-- USERS (anonymous profile visible to peers)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle VARCHAR(20) UNIQUE NOT NULL,        -- e.g. "Teacher_49A2" — only thing peers see
  role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
  state VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CONTACTS (encrypted, never exposed to peers or admins)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_encrypted TEXT,                      -- AES-256 encrypted
  whatsapp_encrypted TEXT,                   -- AES-256 encrypted
  school_name_encrypted TEXT,                -- AES-256 encrypted
  notify_email BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- EVENTS / NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  event_type VARCHAR(50) DEFAULT 'general' CHECK (event_type IN ('general', 'urgent', 'quiz', 'exam', 'holiday', 'other')),
  target_scope VARCHAR(20) NOT NULL CHECK (target_scope IN ('city', 'state', 'all')),
  target_state VARCHAR(100),                 -- NULL means all states
  target_city VARCHAR(100),                  -- NULL means all cities in state
  target_role VARCHAR(20) CHECK (target_role IN ('teacher', 'student', 'all')),
  created_by UUID NOT NULL REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  recipients_count INT DEFAULT 0,
  is_draft BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NOTIFICATION DELIVERY LOG
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'inapp')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(event_id, user_id, channel)
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_state, target_city);
CREATE INDEX IF NOT EXISTS idx_notif_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_event ON notification_log(event_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_status ON notification_log(status);

-- ─────────────────────────────────────────
-- TRIGGERS: updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON user_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
