import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEvents, getNotifications } from '../api';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  urgent: '#c84b31', quiz: '#185FA5', exam: '#854F0B',
  general: '#1d7a6e', holiday: '#533AB7', other: '#5F5E5A',
};

export default function Feed() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    getEvents()
      .then(res => setEvents(res.data.events || []))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>EC</div>
          <div>
            <div style={styles.siteName}>EduConnect</div>
            <div style={styles.location}>{user?.city}, {user?.state}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.handle}>{user?.handle}</div>
          <span style={{ ...styles.roleBadge, background: user?.role === 'teacher' ? '#d1fae5' : '#dbeafe' }}>
            {user?.role}
          </span>
          <button style={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
        </div>
      </header>

      <div style={styles.body}>
        <div style={styles.feedWrap}>
          <h2 style={styles.feedTitle}>Community Feed</h2>
          <p style={styles.feedSub}>Events and announcements for your region</p>

          {loading && <p style={styles.empty}>Loading...</p>}
          {!loading && events.length === 0 && <p style={styles.empty}>No events yet in your area.</p>}

          <div style={styles.list}>
            {events.map(ev => (
              <div key={ev.id} style={styles.card}>
                <div style={{ ...styles.typeBar, background: TYPE_COLORS[ev.event_type] }} />
                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <span style={{ ...styles.typeTag, background: TYPE_COLORS[ev.event_type] }}>
                      {ev.event_type.toUpperCase()}
                    </span>
                    <span style={styles.scope}>
                      {ev.target_scope === 'city' ? `${ev.target_city}, ${ev.target_state}` :
                        ev.target_scope === 'state' ? ev.target_state : 'All India'}
                    </span>
                  </div>
                  <h3 style={styles.cardTitle}>{ev.title}</h3>
                  <p style={styles.cardText}>{ev.body}</p>
                  <div style={styles.cardFooter}>
                    <span style={styles.author}>Posted by {ev.author_handle || 'Admin'}</span>
                    <span style={styles.date}>{new Date(ev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--paper)' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 40px', height: '64px', background: 'var(--white)',
    borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  logo: {
    width: '38px', height: '38px', background: 'var(--accent)', borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Playfair Display, serif', fontWeight: '700', fontSize: '15px', color: '#fff',
  },
  siteName: { fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--ink)' },
  location: { fontSize: '12px', color: 'var(--muted)' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  handle: { fontSize: '14px', fontWeight: '600', color: 'var(--ink)' },
  roleBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  logoutBtn: {
    padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)',
    borderRadius: '7px', fontSize: '13px', color: 'var(--muted)',
  },
  body: { maxWidth: '720px', margin: '0 auto', padding: '40px 20px' },
  feedWrap: {},
  feedTitle: { fontSize: '28px', color: 'var(--ink)', marginBottom: '6px' },
  feedSub: { color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--border)',
    display: 'flex', overflow: 'hidden', boxShadow: 'var(--shadow)',
  },
  typeBar: { width: '5px', flexShrink: 0 },
  cardBody: { padding: '20px 22px', flex: 1 },
  cardTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  typeTag: { padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#fff', letterSpacing: '0.04em' },
  scope: { fontSize: '13px', color: 'var(--muted)' },
  cardTitle: { fontSize: '19px', color: 'var(--ink)', marginBottom: '8px' },
  cardText: { fontSize: '15px', color: '#444', lineHeight: '1.7', marginBottom: '16px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: '12px', color: 'var(--muted)' },
  date: { fontSize: '12px', color: 'var(--muted)' },
  empty: { color: 'var(--muted)', fontSize: '15px', padding: '20px 0' },
};
