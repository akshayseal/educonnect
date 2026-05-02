import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Navbar, Alert, Spinner } from '../components';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({ notify_email: true, notify_whatsapp: false });
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    refreshUser().then(u => {
      setPrefs({ notify_email: u.notify_email, notify_whatsapp: u.notify_whatsapp });
    });
  }, []);

  async function savePrefs(e) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.put('/auth/preferences', {
        notify_email: prefs.notify_email,
        notify_whatsapp: prefs.notify_whatsapp,
        ...(email ? { email } : {}),
        ...(whatsapp ? { whatsapp } : {}),
      });
      setSuccess('Preferences saved');
      setEmail(''); setWhatsapp('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  }

  async function deleteAccount() {
    await api.delete('/auth/account');
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-heading">Settings</h1>
          <p className="text-sm text-ink-400">Manage your account and notification preferences</p>
        </div>

        {/* Profile card */}
        <div className="card mb-4">
          <div className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Your anonymous identity</div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-mono text-sm font-medium">
              {user?.handle?.slice(-2)}
            </div>
            <div>
              <div className="font-mono text-lg font-medium text-ink-900">{user?.handle}</div>
              <div className="text-sm text-ink-400">{user?.role} · {user?.city}, {user?.state}</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-ink-50 rounded-lg text-xs text-ink-500">
            &#128274; This is the only identity other members see. Your real name, school, and contact details are never shared.
          </div>
        </div>

        {/* Notification preferences */}
        <form onSubmit={savePrefs} className="card mb-4 space-y-4">
          <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">Notification channels</div>

          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium text-ink-800">Email notifications</div>
              <div className="text-xs text-ink-400">Receive event alerts via email</div>
            </div>
            <input type="checkbox" checked={prefs.notify_email}
              onChange={e => setPrefs(p => ({ ...p, notify_email: e.target.checked }))}
              className="w-4 h-4" />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium text-ink-800">WhatsApp notifications</div>
              <div className="text-xs text-ink-400">Receive event alerts on WhatsApp</div>
            </div>
            <input type="checkbox" checked={prefs.notify_whatsapp}
              onChange={e => setPrefs(p => ({ ...p, notify_whatsapp: e.target.checked }))}
              className="w-4 h-4" />
          </label>

          <div className="border-t border-ink-100 pt-3">
            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Update contact info</div>
            <div className="space-y-3">
              <div>
                <label className="label">New email address</label>
                <input className="input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className="label">New WhatsApp number</label>
                <input className="input" type="tel" value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)} placeholder="Leave blank to keep current" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Spinner size="sm" /> Saving…</> : 'Save preferences'}
          </button>
        </form>

        {/* Danger zone */}
        <div className="card border-crimson-100">
          <div className="text-xs font-medium text-crimson-600 uppercase tracking-wide mb-3">Danger zone</div>
          <p className="text-sm text-ink-600 mb-4">
            Deleting your account will deactivate it and immediately purge your email, WhatsApp number, and school name from our database. Your anonymous handle will be retired.
          </p>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="btn-danger w-full">
              Delete my account
            </button>
          ) : (
            <div className="space-y-2">
              <Alert type="error">Are you sure? This cannot be undone.</Alert>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={deleteAccount} className="btn-danger flex-1">Yes, delete account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
