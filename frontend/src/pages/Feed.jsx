import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Navbar, EventCard, EmptyState, Spinner, Modal } from '../components';
import { format } from 'date-fns';

const EVENT_TYPES = ['all', 'urgent', 'quiz', 'exam', 'general', 'holiday', 'other'];

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [unread, setUnread] = useState(0);

  const fetchEvents = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/events?page=${pg}&limit=20`);
      setEvents(pg === 1 ? data.events : prev => [...prev, ...data.events]);
      setPage(pg);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchEvents(1);
    api.get('/notifications').then(({ data }) => setUnread(data.unread));
  }, [fetchEvents]);

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar unreadCount={unread} />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="section-heading">Community Feed</h1>
          <p className="text-sm text-ink-400">
            Events and announcements for {user?.city}, {user?.state}
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Your city', value: user?.city },
            { label: 'Your state', value: user?.state },
            { label: 'Your handle', value: user?.handle, mono: true },
          ].map(s => (
            <div key={s.label} className="card py-3">
              <div className="text-xs text-ink-400 mb-0.5">{s.label}</div>
              <div className={`text-sm font-medium text-ink-800 truncate ${s.mono ? 'font-mono' : ''}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {EVENT_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-colors ${
                filter === t
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
              }`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Events list */}
        {loading && page === 1 ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📭" title="No events yet"
            subtitle="Events posted by admins for your city and state will appear here" />
        ) : (
          <div className="space-y-3">
            {filtered.map(event => (
              <EventCard key={event.id} event={event} onClick={setSelectedEvent} />
            ))}
            <div className="text-center pt-2">
              <button onClick={() => fetchEvents(page + 1)}
                disabled={loading}
                className="btn-secondary text-sm">
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <Modal title={selectedEvent.title} onClose={() => setSelectedEvent(null)}>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <span className={`badge badge-${selectedEvent.event_type}`}>
                {selectedEvent.event_type}
              </span>
              <span className="badge bg-ink-100 text-ink-600">
                &#127759; {selectedEvent.target_city || selectedEvent.target_state || 'All India'}
              </span>
            </div>
            <p className="text-ink-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedEvent.body}</p>
            <div className="border-t border-ink-100 pt-4 flex items-center justify-between text-xs text-ink-400">
              <span className="anon-chip">&#128100; {selectedEvent.author_handle}</span>
              <span>{format(new Date(selectedEvent.created_at), 'PPP')}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
