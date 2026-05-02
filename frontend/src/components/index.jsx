import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

// ─── Navbar ──────────────────────────────────────────────────────────────────
export function Navbar({ unreadCount = 0 }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { to: '/feed', label: 'Community Feed' },
    { to: '/notifications', label: 'Notifications', badge: unreadCount },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-ink-100">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link to="/feed" className="font-display text-lg font-semibold text-ink-900 mr-2">
          Edu<span className="text-sky-600">Connect</span>
        </Link>
        <div className="flex items-center gap-1 flex-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`relative px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname.startsWith(l.to)
                  ? 'bg-sky-50 text-sky-700 font-medium'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
              }`}>
              {l.label}
              {l.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-crimson-400 text-white text-[10px] rounded-full flex items-center justify-center">
                  {l.badge > 9 ? '9+' : l.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="anon-chip">&#128100; {user?.handle}</span>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Event Card ──────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  urgent: 'border-crimson-400 bg-crimson-50',
  quiz: 'border-sky-600 bg-sky-50',
  exam: 'border-amber-400 bg-amber-50',
  general: 'border-jade-400 bg-jade-50',
  holiday: 'border-purple-400 bg-purple-50',
  other: 'border-ink-300 bg-ink-50',
};

export function EventCard({ event, onClick }) {
  const scope = event.target_city
    ? `${event.target_city}, ${event.target_state}`
    : event.target_state || 'All India';

  return (
    <div
      className={`card border-l-4 ${TYPE_COLORS[event.event_type] || TYPE_COLORS.other} cursor-pointer 
                  hover:shadow-md transition-all duration-150 fade-up`}
      onClick={() => onClick?.(event)}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge badge-${event.event_type}`}>
            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
          </span>
          <span className="badge bg-ink-100 text-ink-600">&#127759; {scope}</span>
          {event.my_status !== 'read' && (
            <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" title="Unread" />
          )}
        </div>
        <span className="text-xs text-ink-400 whitespace-nowrap">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </span>
      </div>
      <h3 className="font-display text-base font-semibold text-ink-900 mb-1">{event.title}</h3>
      <p className="text-sm text-ink-600 line-clamp-2 mb-3">{event.body}</p>
      <div className="flex items-center justify-between">
        <span className="anon-chip">&#128100; {event.author_handle}</span>
        {event.recipients_count > 0 && (
          <span className="text-xs text-ink-400">{event.recipients_count.toLocaleString()} members notified</span>
        )}
      </div>
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin`} />
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-display text-lg text-ink-700 mb-1">{title}</h3>
      <p className="text-sm text-ink-400">{subtitle}</p>
    </div>
  );
}

// ─── Alert banner ────────────────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info: 'bg-sky-50 border-sky-200 text-sky-800',
    error: 'bg-crimson-50 border-crimson-200 text-crimson-700',
    success: 'bg-jade-50 border-jade-400 text-jade-600',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>
  );
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(26,25,23,0.55)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl fade-up">
        <div className="flex items-center justify-between p-5 border-b border-ink-100">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
