import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Navbar, Spinner, EmptyState } from '../components';
import { formatDistanceToNow } from 'date-fns';

const CHANNEL_ICONS = { email: '✉️', whatsapp: '💬', sms: '📱', inapp: '🔔' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => {
      setNotifications(data.notifications);
      setUnread(data.unread);
      setLoading(false);
    });
  }, []);

  async function markAllRead() {
    await api.put('/notifications/read-all');
    setNotifications(n => n.map(x => ({ ...x, status: 'read' })));
    setUnread(0);
  }

  // Deduplicate by event_id (show latest channel)
  const grouped = {};
  notifications.forEach(n => {
    if (!grouped[n.event_id]) grouped[n.event_id] = [];
    grouped[n.event_id].push(n);
  });

  const items = Object.values(grouped).map(group => ({
    ...group[0],
    channels: group.map(g => g.channel),
    isRead: group.every(g => g.status === 'read'),
  }));

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar unreadCount={unread} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-heading">Notifications</h1>
            <p className="text-sm text-ink-400">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-xs">Mark all read</button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications yet"
            subtitle="Notifications from admins for your city will appear here" />
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id}
                className={`card flex gap-4 transition-all ${!item.isRead ? 'border-sky-200 bg-sky-50/30' : ''}`}>
                <div className="mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${!item.isRead ? 'bg-sky-600' : 'bg-ink-200'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`text-sm ${!item.isRead ? 'font-medium text-ink-900' : 'text-ink-700'}`}>
                        {item.title}
                      </div>
                      <div className="text-xs text-ink-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>&#128100; {item.author_handle}</span>
                        <span>·</span>
                        <span>{item.target_city || item.target_state || 'All India'}</span>
                        <span>·</span>
                        <span className="flex gap-1">
                          {item.channels.map(c => (
                            <span key={c} title={c}>{CHANNEL_ICONS[c]}</span>
                          ))}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-ink-400 whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(item.sent_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
