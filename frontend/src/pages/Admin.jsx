import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Navbar, Spinner, Alert, EmptyState } from '../components';
import { STATES_CITIES, STATES } from '../utils/locations';
import { formatDistanceToNow } from 'date-fns';

const EVENT_TYPES = ['general', 'urgent', 'quiz', 'exam', 'holiday', 'other'];
const TYPE_EMOJI = { urgent: '🔴', quiz: '📝', exam: '📋', general: '📢', holiday: '🎉', other: '📌' };

export default function AdminPage() {
  const [tab, setTab] = useState('compose');
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    body: '',
    event_type: 'general',
    target_scope: 'city',
    target_state: '',
    target_city: '',
    target_role: 'all',
    send_now: true,
    notify_channels: { email: true, whatsapp: true },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cities = form.target_state ? (STATES_CITIES[form.target_state] || []) : [];

  useEffect(() => {
    api.get('/events/admin/all').then(({ data }) => setEvents(data.events));
    api.get('/notifications/stats').then(({ data }) => setStats(data));
  }, []);

  async function fetchPreview() {
    setPreviewLoading(true);
    try {
      const { data } = await api.post('/events/preview', {
        target_scope: form.target_scope,
        target_state: form.target_state,
        target_city: form.target_city,
        target_role: form.target_role,
      });
      setPreview(data);
    } finally { setPreviewLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.body) { setError('Title and message are required'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await api.post('/events', form);
      setSuccess(`Event created! ${data.dispatching ? 'Sending notifications now…' : 'Saved as draft.'}`);
      setForm(f => ({ ...f, title: '', body: '' }));
      setPreview(null);
      // Refresh events list
      const evRes = await api.get('/events/admin/all');
      setEvents(evRes.data.events);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-heading">Admin Panel</h1>
          <p className="text-sm text-ink-400">Broadcast events and manage community notifications</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total members', value: stats.total_users.toLocaleString() },
              { label: 'Events sent', value: stats.total_events.toLocaleString() },
              { label: 'Notifications delivered', value: stats.total_sent.toLocaleString() },
              { label: 'Active cities', value: stats.members_by_city?.length || 0 },
            ].map(s => (
              <div key={s.label} className="card py-3">
                <div className="text-xs text-ink-400 mb-1">{s.label}</div>
                <div className="text-xl font-display font-semibold text-ink-900">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-ink-200 pb-0">
          {['compose', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-sky-600 text-sky-700' : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}>
              {t === 'compose' ? '✏️ Compose notification' : '📋 History'}
            </button>
          ))}
        </div>

        {tab === 'compose' && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            <form onSubmit={handleSubmit} className="card space-y-4">
              {error && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              <div>
                <label className="label">Event type</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button type="button" key={t} onClick={() => set('event_type', t)}
                      className={`py-2 rounded-lg text-xs border transition-all ${
                        form.event_type === t
                          ? 'border-sky-600 bg-sky-50 text-sky-700 font-medium'
                          : 'border-ink-200 text-ink-600 hover:border-ink-300'
                      }`}>
                      {TYPE_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Inter-school quiz — May 18" required maxLength={255} />
              </div>

              <div>
                <label className="label">Message</label>
                <textarea className="input resize-none" rows={5} value={form.body}
                  onChange={e => set('body', e.target.value)}
                  placeholder="Full details of the event, venue, timings, etc." required />
              </div>

              <div className="border-t border-ink-100 pt-4">
                <div className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Targeting</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { v: 'city', label: '📍 City' },
                    { v: 'state', label: '🗺 State' },
                    { v: 'all', label: '🌐 All India' },
                  ].map(s => (
                    <button type="button" key={s.v} onClick={() => set('target_scope', s.v)}
                      className={`py-2 rounded-lg text-xs border transition-all ${
                        form.target_scope === s.v
                          ? 'border-sky-600 bg-sky-50 text-sky-700 font-medium'
                          : 'border-ink-200 text-ink-600 hover:border-ink-300'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {form.target_scope !== 'all' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">State</label>
                      <select className="input text-xs" value={form.target_state}
                        onChange={e => { set('target_state', e.target.value); set('target_city', ''); }} required>
                        <option value="">Select state</option>
                        {STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    {form.target_scope === 'city' && (
                      <div>
                        <label className="label">City</label>
                        <select className="input text-xs" value={form.target_city}
                          onChange={e => set('target_city', e.target.value)} required disabled={!form.target_state}>
                          <option value="">Select city</option>
                          {cities.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <label className="label">Audience</label>
                  <select className="input" value={form.target_role} onChange={e => set('target_role', e.target.value)}>
                    <option value="all">Teachers + Students</option>
                    <option value="teacher">Teachers only</option>
                    <option value="student">Students only</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fetchPreview} disabled={previewLoading}
                  className="btn-secondary flex items-center gap-2">
                  {previewLoading ? <Spinner size="sm" /> : null}
                  Preview recipients
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <><Spinner size="sm" /> Sending…</> : '📤 Send notification'}
                </button>
              </div>
            </form>

            {/* Preview panel */}
            <div className="space-y-3">
              {preview ? (
                <div className="card">
                  <div className="text-sm font-medium text-ink-800 mb-3">Recipient preview</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Total members</span>
                      <span className="font-medium">{preview.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Via email</span>
                      <span className="font-medium text-sky-700">{preview.by_channel.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Via WhatsApp</span>
                      <span className="font-medium text-jade-600">{preview.by_channel.whatsapp}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">In-app only</span>
                      <span className="font-medium">{preview.by_channel.inapp}</span>
                    </div>
                    <div className="border-t border-ink-100 pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Teachers</span>
                        <span>{preview.by_role.teachers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Students</span>
                        <span>{preview.by_role.students}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-ink-50 rounded-lg p-3 text-xs text-ink-500">
                    &#128274; Individual identities are not shown. Only aggregated counts.
                  </div>
                </div>
              ) : (
                <div className="card border-dashed text-center py-8">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-sm text-ink-400">Click "Preview recipients" to see how many members will be notified</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <EmptyState icon="📋" title="No events yet" subtitle="Events you create will appear here" />
            ) : events.map(event => (
              <div key={event.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className={`badge badge-${event.event_type}`}>
                        {TYPE_EMOJI[event.event_type]} {event.event_type}
                      </span>
                      {event.sent_at ? (
                        <span className="badge bg-jade-50 text-jade-600">✓ Sent</span>
                      ) : (
                        <span className="badge bg-amber-50 text-amber-700">Draft</span>
                      )}
                      <span className="badge bg-ink-100 text-ink-600">
                        {event.target_city || event.target_state || 'All India'}
                      </span>
                    </div>
                    <div className="font-medium text-ink-900 text-sm">{event.title}</div>
                    <div className="text-xs text-ink-400 mt-1">
                      {event.recipients_count > 0 && `${event.recipients_count} members · `}
                      {event.sent_at
                        ? formatDistanceToNow(new Date(event.sent_at), { addSuffix: true })
                        : formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {!event.sent_at && (
                    <button onClick={async () => {
                      await api.post(`/events/${event.id}/send`);
                      const { data } = await api.get('/events/admin/all');
                      setEvents(data.events);
                    }} className="btn-primary text-xs py-1.5 px-3 shrink-0">
                      Send now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
