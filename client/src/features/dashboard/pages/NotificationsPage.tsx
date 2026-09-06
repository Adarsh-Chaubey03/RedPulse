import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RED    = '#c0392b';
const BORDER = '#e5e7eb';

interface Notification {
  id: number;
  title: string;
  desc: React.ReactNode;
  time: string;
  read: boolean;
  action: string;
  actionLabel: string;
}

const INITIAL: Notification[] = [
  {
    id: 1, read: false,
    title: 'Emergency O+ request nearby',
    desc: (<>St. Mary&apos;s <span style={{ color: RED }}>Hospital</span> is <span style={{ color: RED }}>looking</span> for 2 units <span style={{ color: RED }}>within 2.4 km</span>.</>),
    time: '8 min ago',
    action: '/blood-requests', actionLabel: 'View request',
  },
  {
    id: 2, read: false,
    title: 'Profile verified',
    desc: (<>Your donor profile is now <span style={{ color: RED }}>verified</span> and <span style={{ color: RED }}>visible</span> to hospitals.</>),
    time: 'Yesterday',
    action: '/profile', actionLabel: 'View details',
  },
  {
    id: 3, read: false,
    title: 'Donation milestone',
    desc: 'Thank you for completing your 4th donation.',
    time: '3 days ago',
    action: '/profile', actionLabel: 'View details',
  },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL);

  const markRead = (id: number) =>
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllRead = () =>
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            background: '#fef2f2', border: `1px solid #fecaca`,
            color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10,
          }}>
            Notification center
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            Your notifications
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
            Important updates <span style={{ color: RED }}>from</span> your RedPulse network.
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{
            padding: '9px 18px', borderRadius: 8,
            border: `1px solid ${BORDER}`, background: '#fff',
            fontSize: 13, color: '#374151', cursor: 'pointer', flexShrink: 0,
          }}>
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        {notifs.map((n, i) => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            padding: '18px 20px',
            borderBottom: i < notifs.length - 1 ? `1px solid ${BORDER}` : 'none',
            background: n.read ? '#fff' : '#fefefe',
          }}>
            {/* Bell icon */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: n.read ? '#f3f4f6' : '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 16,
            }}>
              🔔
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{n.title}</p>
                {!n.read && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED, flexShrink: 0 }} />
                )}
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>{n.desc}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{n.time}</p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button onClick={() => navigate(n.action)} style={{
                padding: '7px 14px', borderRadius: 7,
                border: `1px solid ${BORDER}`, background: '#fff',
                fontSize: 12, color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {n.actionLabel} →
              </button>
              {!n.read && (
                <button onClick={() => markRead(n.id)} style={{
                  background: 'none', border: 'none',
                  fontSize: 12, color: '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = RED)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
