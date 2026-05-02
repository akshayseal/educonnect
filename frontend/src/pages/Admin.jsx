import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers, getEvents, createEvent, sendEvent, deleteEvent } from '../api';
import toast from 'react-hot-toast';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh',
];

const TYPE_COLORS = {
  urgent: '#c84b31', quiz: '#185FA5', exam: '#854F0B',
  general: '#1d7a6e', holiday: '#533AB7', other: '#5F5E5A',
};

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total: 0, teachers: 0, students: 0, admins: 0 });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sending, setSending] = useState(null);
  const [userFilter, setUserFilter] = useState({ role: '', state: '', city: '' });
  const [eventForm, setEventForm] = useState({
    title: '', body: '', event_type: 'general',
    target_scope: 'all', target_state: '', target_city: '', target_role: 'all',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    loadUsers();
    loadEvents();
  }, []);

  const loadUsers = async (filters = {}) => {
    setLoadingUsers(true);
    try {
      const res = await getUsers(filters);
      setUsers(res.data.users || []);
      const u = res.data.users || [];
      setStats({
        total: u.length,
        teachers: u.filter(x => x.role === 'teacher').length,
        students: u.filter(x => x.role === 'student').length,
        admins: u.filter(x => x.role === 'admin').length,
      });
    } catch { toast.error('Failed to load users'); }
    finally { setLoadingUsers(false); }
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await getEvents();
      setEvents(res.data.events || []);
    } catch { toast.error('Failed to load events'); }
    finally { setLoadingEvents(false); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createEvent(eventForm);
      toast.success('Event created!');
      setEventForm({ title: '', body: '', event_type: 'general', target_scope: 'all', target_state: '', target_city: '', target_role: 'all' });
      loadEvents();
      setTab('events');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event');
    } finally { setCreating(false); }
  };

  const handleSend = async (id) => {
    setSending(id);
    try {
      const res = await sendEvent(id);
      toast.success(`Sent to ${res.data.recipients_count || 0} recipients!`);
      loadEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally { setSending(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteEvent(id);
      toast.success('Deleted');
      loadEvents();
    } catch { toast.error('Failed to delete'); }
  };

  const applyUserFilter = () => loadUsers(userFilter);

  const statCards = [
    { label: 'Total Members', value: stats.total, color: 'var(--ink)' },
    { label: 'Teachers', value: stats.teachers, color: 'var(--teal)' },
    { label: 'Students', value: stats.students, color: 'var(--accent)' },
    { label: 'Admins', value: stats.admins, color: 'var(--gold)' },
  ];

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sideTop}>
          <div style={styles.logo}>EC</div>
          <div>
            <div style={styles.logoText}>EduConnect</div>
            <div style={styles.adminBadge}>Admin Panel</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'users', label: '👥 Members' },
            { id: 'events', label: '📢 Events' },
            { id: 'compose', label: '✉️ Compose' },
          ].map(item => (
            <button key={item.id}
              style={{ ...styles.navBtn, ...(tab === item.id ? styles.navBtnActive : {}) }}
              onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.sideBottom}>
          <div style={styles.userInfo}>
            <div style={styles.userHandle}>{user?.handle}</div>
            <div style={styles.userRole}>Administrator</div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div style={styles.content}>
            <h2 style={styles.pageTitle}>Dashboard</h2>
            <div style={styles.statsGrid}>
              {statCards.map(s => (
                <div key={s.label} style={styles.statCard}>
                  <div style={{ ...styles.statNum, color: s.color }}>{s.value}</div>
                  <div style={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.recentSection}>
              <h3 style={styles.sectionTitle}>Recent Events</h3>
              {events.slice(0, 5).map(ev => (
                <div key={ev.id} style={styles.eventRow}>
                  <div style={{ ...styles.typeDot, background: TYPE_COLORS[ev.event_type] }} />
                  <div style={styles.eventInfo}>
                    <div style={styles.eventTitle}>{ev.title}</div>
                    <div style={styles.eventMeta}>
                      {ev.target_scope} · {ev.event_type} · {new Date(ev.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div style={{ ...styles.statusPill, background: ev.sent_at ? '#e8f5e9' : '#fff3e0', color: ev.sent_at ? '#2e7d32' : '#e65100' }}>
                    {ev.sent_at ? '✓ Sent' : 'Draft'}
                  </div>
                </div>
              ))}
              {events.length === 0 && <p style={styles.empty}>No events yet. Create one!</p>}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div style={styles.content}>
            <h2 style={styles.pageTitle}>Members</h2>
            <div style={styles.filterRow}>
              <select style={styles.filterInput} value={userFilter.role}
                onChange={e => setUserFilter(f => ({ ...f, role: e.target.value }))}>
                <option value="">All Roles</option>
                <option value="teacher">Teachers</option>
                <option value="student">Students</option>
                <option value="admin">Admins</option>
              </select>
              <select style={styles.filterInput} value={userFilter.state}
                onChange={e => setUserFilter(f => ({ ...f, state: e.target.value }))}>
                <option value="">All States</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input style={styles.filterInput} placeholder="Filter by city..."
                value={userFilter.city}
                onChange={e => setUserFilter(f => ({ ...f, city: e.target.value }))} />
              <button style={styles.filterBtn} onClick={applyUserFilter}>Filter</button>
            </div>

            {loadingUsers ? <p style={styles.empty}>Loading...</p> : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Handle', 'Role', 'State', 'City', 'Verified', 'Joined'].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={styles.tr}>
                        <td style={styles.td}><strong>{u.handle}</strong></td>
                        <td style={styles.td}>
                          <span style={{ ...styles.rolePill, background: u.role === 'admin' ? '#fef3c7' : u.role === 'teacher' ? '#d1fae5' : '#dbeafe' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={styles.td}>{u.state}</td>
                        <td style={styles.td}>{u.city}</td>
                        <td style={styles.td}>{u.is_verified ? '✓' : '—'}</td>
                        <td style={styles.td}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p style={styles.empty}>No members found.</p>}
              </div>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {tab === 'events' && (
          <div style={styles.content}>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>Events</h2>
              <button style={styles.primaryBtn} onClick={() => setTab('compose')}>+ New Event</button>
            </div>

            {loadingEvents ? <p style={styles.empty}>Loading...</p> : (
              <div style={styles.eventsList}>
                {events.map(ev => (
                  <div key={ev.id} style={styles.eventCard}>
                    <div style={styles.eventCardTop}>
                      <div style={{ ...styles.typeTag, background: TYPE_COLORS[ev.event_type] }}>
                        {ev.event_type.toUpperCase()}
                      </div>
                      <div style={styles.eventCardMeta}>
                        {ev.target_scope === 'city' ? `${ev.target_city}, ${ev.target_state}` :
                          ev.target_scope === 'state' ? ev.target_state : 'All India'}
                        {' · '}{ev.target_role === 'all' ? 'Everyone' : ev.target_role + 's'}
                      </div>
                    </div>
                    <h3 style={styles.eventCardTitle}>{ev.title}</h3>
                    <p style={styles.eventCardBody}>{ev.body.slice(0, 120)}{ev.body.length > 120 ? '...' : ''}</p>
                    <div style={styles.eventCardFooter}>
                      <span style={styles.eventDate}>{new Date(ev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {ev.sent_at ? (
                        <span style={styles.sentBadge}>✓ Sent to {ev.recipients_count} recipients</span>
                      ) : (
                        <div style={styles.eventActions}>
                          <button style={styles.sendBtn} onClick={() => handleSend(ev.id)}
                            disabled={sending === ev.id}>
                            {sending === ev.id ? 'Sending...' : '📤 Send Now'}
                          </button>
                          <button style={styles.deleteBtn} onClick={() => handleDelete(ev.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {events.length === 0 && <p style={styles.empty}>No events yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* COMPOSE TAB */}
        {tab === 'compose' && (
          <div style={styles.content}>
            <h2 style={styles.pageTitle}>Compose Event</h2>
            <p style={styles.composeSubtitle}>Create a notification to broadcast to your community via Email & WhatsApp</p>

            <form onSubmit={handleCreateEvent} style={styles.composeForm}>
              <div style={styles.formGrid}>
                <div style={styles.formLeft}>
                  <div style={styles.field}>
                    <label style={styles.label}>Event Title *</label>
                    <input style={styles.input} placeholder="e.g. Final Exam Schedule Released"
                      value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Message *</label>
                    <textarea style={{ ...styles.input, minHeight: '140px', resize: 'vertical' }}
                      placeholder="Write your message here..."
                      value={eventForm.body} onChange={e => setEventForm(f => ({ ...f, body: e.target.value }))} required />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Event Type</label>
                    <div style={styles.typeGrid}>
                      {Object.entries(TYPE_COLORS).map(([type, color]) => (
                        <button key={type} type="button"
                          style={{ ...styles.typeBtn, borderColor: eventForm.event_type === type ? color : 'var(--border)', background: eventForm.event_type === type ? color : 'var(--white)', color: eventForm.event_type === type ? 'white' : 'var(--ink)' }}
                          onClick={() => setEventForm(f => ({ ...f, event_type: type }))}>
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={styles.formRight}>
                  <div style={styles.targetBox}>
                    <h4 style={styles.targetTitle}>📍 Target Audience</h4>

                    <div style={styles.field}>
                      <label style={styles.label}>Scope</label>
                      <select style={styles.input} value={eventForm.target_scope}
                        onChange={e => setEventForm(f => ({ ...f, target_scope: e.target.value, target_state: '', target_city: '' }))}>
                        <option value="all">All India</option>
                        <option value="state">Specific State</option>
                        <option value="city">Specific City</option>
                      </select>
                    </div>

                    {(eventForm.target_scope === 'state' || eventForm.target_scope === 'city') && (
                      <div style={styles.field}>
                        <label style={styles.label}>State</label>
                        <select style={styles.input} value={eventForm.target_state}
                          onChange={e => setEventForm(f => ({ ...f, target_state: e.target.value }))} required>
                          <option value="">Select state</option>
                          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}

                    {eventForm.target_scope === 'city' && (
                      <div style={styles.field}>
                        <label style={styles.label}>City</label>
                        <input style={styles.input} placeholder="Enter city name"
                          value={eventForm.target_city}
                          onChange={e => setEventForm(f => ({ ...f, target_city: e.target.value }))} required />
                      </div>
                    )}

                    <div style={styles.field}>
                      <label style={styles.label}>Send To</label>
                      <select style={styles.input} value={eventForm.target_role}
                        onChange={e => setEventForm(f => ({ ...f, target_role: e.target.value }))}>
                        <option value="all">Everyone</option>
                        <option value="teacher">Teachers Only</option>
                        <option value="student">Students Only</option>
                      </select>
                    </div>

                    <div style={styles.channelInfo}>
                      <div style={styles.channelItem}>📧 <strong>Email</strong> — via SendGrid</div>
                      <div style={styles.channelItem}>💬 <strong>WhatsApp</strong> — via Twilio</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setTab('events')}>Cancel</button>
                <button type="submit" style={{ ...styles.primaryBtn, opacity: creating ? 0.7 : 1 }} disabled={creating}>
                  {creating ? 'Creating...' : '✓ Create Event'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', minHeight: '100vh', background: 'var(--paper)' },
  sidebar: {
    width: '240px', background: 'var(--ink)', display: 'flex',
    flexDirection: 'column', padding: '24px 0', flexShrink: 0,
  },
  sideTop: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px 28px' },
  logo: {
    width: '40px', height: '40px', background: 'var(--accent)', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Playfair Display, serif', fontWeight: '700', fontSize: '16px', color: '#fff', flexShrink: 0,
  },
  logoText: { color: '#fff', fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600' },
  adminBadge: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', flex: 1 },
  navBtn: {
    padding: '11px 16px', background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.6)', borderRadius: '8px', textAlign: 'left',
    fontSize: '14px', fontWeight: '500', transition: 'all 0.15s',
  },
  navBtnActive: { background: 'rgba(255,255,255,0.12)', color: '#fff' },
  sideBottom: { padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '20px' },
  userInfo: { marginBottom: '12px' },
  userHandle: { color: '#fff', fontSize: '14px', fontWeight: '600' },
  userRole: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  logoutBtn: {
    width: '100%', padding: '9px', background: 'rgba(200,75,49,0.2)', border: '1px solid rgba(200,75,49,0.4)',
    borderRadius: '7px', color: '#e8624a', fontSize: '13px', fontWeight: '500',
  },
  main: { flex: 1, overflow: 'auto' },
  content: { padding: '36px 40px', maxWidth: '1000px' },
  pageTitle: { fontSize: '28px', marginBottom: '24px', color: 'var(--ink)' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' },
  statCard: {
    background: 'var(--white)', borderRadius: '12px', padding: '24px',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
  },
  statNum: { fontSize: '40px', fontFamily: 'Playfair Display, serif', fontWeight: '700', lineHeight: 1 },
  statLabel: { color: 'var(--muted)', fontSize: '13px', marginTop: '6px' },
  recentSection: { background: 'var(--white)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' },
  sectionTitle: { fontSize: '18px', marginBottom: '20px', color: 'var(--ink)' },
  eventRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--paper-dark)' },
  typeDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: '14px', fontWeight: '600', color: 'var(--ink)' },
  eventMeta: { fontSize: '12px', color: 'var(--muted)', marginTop: '2px' },
  statusPill: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  filterInput: {
    padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: '8px',
    fontSize: '13px', background: 'var(--white)', color: 'var(--ink)',
  },
  filterBtn: {
    padding: '9px 20px', background: 'var(--ink)', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
  },
  tableWrap: { background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', background: 'var(--paper)' },
  tr: { borderBottom: '1px solid var(--paper-dark)' },
  td: { padding: '12px 16px', fontSize: '14px', color: 'var(--ink)' },
  rolePill: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  eventsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  eventCard: {
    background: 'var(--white)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow)',
  },
  eventCardTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
  typeTag: { padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#fff', letterSpacing: '0.05em' },
  eventCardMeta: { fontSize: '13px', color: 'var(--muted)' },
  eventCardTitle: { fontSize: '18px', marginBottom: '8px', color: 'var(--ink)' },
  eventCardBody: { fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '16px' },
  eventCardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  eventDate: { fontSize: '12px', color: 'var(--muted)' },
  sentBadge: { fontSize: '13px', color: 'var(--teal)', fontWeight: '500' },
  eventActions: { display: 'flex', gap: '10px' },
  sendBtn: {
    padding: '8px 18px', background: 'var(--teal)', color: '#fff',
    border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600',
  },
  deleteBtn: {
    padding: '8px 14px', background: 'transparent', color: 'var(--accent)',
    border: '1px solid var(--accent)', borderRadius: '7px', fontSize: '13px',
  },
  primaryBtn: {
    padding: '10px 24px', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
  },
  composeSubtitle: { color: 'var(--muted)', marginBottom: '28px', fontSize: '15px' },
  composeForm: {},
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', marginBottom: '24px' },
  formLeft: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formRight: {},
  targetBox: {
    background: 'var(--white)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  targetTitle: { fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { fontSize: '11px', fontWeight: '700', color: 'var(--ink)', letterSpacing: '0.07em', textTransform: 'uppercase' },
  input: {
    padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: '8px',
    fontSize: '14px', background: 'var(--white)', color: 'var(--ink)', width: '100%',
  },
  typeGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  typeBtn: {
    padding: '7px 14px', border: '1.5px solid', borderRadius: '6px',
    fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em',
  },
  channelInfo: {
    background: 'var(--paper)', borderRadius: '8px', padding: '14px',
    display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px',
  },
  channelItem: { fontSize: '13px', color: 'var(--muted)' },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '10px 24px', background: 'transparent', color: 'var(--muted)',
    border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '14px',
  },
  empty: { color: 'var(--muted)', padding: '20px 0', fontSize: '14px' },
};
