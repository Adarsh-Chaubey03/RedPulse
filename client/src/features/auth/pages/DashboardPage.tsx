import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { listBloodRequests } from '../../blood-request/services/bloodRequestApi';
import type { BloodRequest, RequestStatus } from '../../blood-request/types';
import { StatCard, RED, BORDER } from '../../dashboard/components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<RequestStatus, string> = {
  searching:          'Searching',
  partiallyFulfilled: 'Partially Fulfilled',
  fulfilled:          'Fulfilled',
  expired:            'Expired',
  cancelled:          'Cancelled',
};

const STATUS_STYLE: Record<RequestStatus, React.CSSProperties> = {
  searching:          { background: '#eff6ff', color: '#2563eb' },
  partiallyFulfilled: { background: '#fffbeb', color: '#d97706' },
  fulfilled:          { background: '#f0fdf4', color: '#16a34a' },
  expired:            { background: '#f3f4f6', color: '#6b7280' },
  cancelled:          { background: '#fef2f2', color: RED },
};

const URGENCY_STYLE: Record<string, React.CSSProperties> = {
  critical: { background: '#fef2f2', color: RED },
  urgent:   { background: '#fffbeb', color: '#d97706' },
  normal:   { background: '#f0fdf4', color: '#16a34a' },
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// Mock notifications for "Latest updates" panel
const MOCK_UPDATES = [
  { id: 1, title: 'Emergency O+ request nearby', desc: "St. Mary's Hospital is looking for 2 units within 2.4 km.", time: '8 min ago' },
  { id: 2, title: 'Profile verified',            desc: 'Your donor profile is now verified and visible to hospitals.', time: 'Yesterday' },
  { id: 3, title: 'Donation milestone',          desc: 'Thank you for completing your 4th donation.',              time: '3 days ago' },
];


// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await listBloodRequests({ requestedBy: user._id, limit: 20 });
      setRequests(res.data.requests);
    } catch {
      /* silent — stats will show 0 */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const firstName  = user.firstName ?? user.email;
  const active     = requests.filter(r => r.status === 'searching' || r.status === 'partiallyFulfilled');
  const fulfilled  = requests.filter(r => r.status === 'fulfilled').length;
  const donorResps = requests.reduce((sum, r) => sum + (r.unitsRequired ?? 0), 0);

  return (
    <div style={{ maxWidth: 960 }}>
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          {/* Pill */}
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            background: '#fef2f2', border: `1px solid #fecaca`,
            color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10,
          }}>
            Patient dashboard
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            {greeting()}, {firstName}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
            Track <span style={{ color: RED }}>active requests</span> and find the support you need.
          </p>
        </div>
        <button onClick={() => navigate('/blood-requests/new')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 8,
          background: RED, color: '#fff',
          border: 'none', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', flexShrink: 0,
        }}>
          ⚡ Create blood request →
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard icon="⚡" label="Active requests"  value={loading ? '…' : active.length}    sub={active.length === 1 ? '1 needs attention' : `${active.length} need attention`}   iconBg="#fef2f2" iconColor={RED}       />
        <StatCard icon="👥" label="Donor responses"  value={loading ? '…' : donorResps}       sub="Across all requests"                                                               iconBg="#eff6ff" iconColor="#2563eb"   />
        <StatCard icon="✅" label="Fulfilled requests" value={loading ? '…' : fulfilled}      sub="Since joining"                                                                     iconBg="#f0fdf4" iconColor="#16a34a"   />
        <StatCard icon="🔔" label="Notifications"    value={3}                                 sub="2 unread"                                                                          iconBg="#fffbeb" iconColor="#d97706"   />
      </div>

      {/* ── Main content grid ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Active blood requests */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Active blood requests</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Live status from your <span style={{ color: RED }}>care team</span></p>
            </div>
            <button onClick={() => navigate('/blood-requests')} style={{
              background: 'none', border: 'none', fontSize: 12, color: RED, cursor: 'pointer', fontWeight: 600,
            }}>
              View all
            </button>
          </div>

          {loading && <p style={{ padding: '24px 20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}

          {!loading && active.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No active requests. Create one to get started.</p>
              <button onClick={() => navigate('/blood-requests/new')} style={{
                marginTop: 12, padding: '8px 18px', borderRadius: 7,
                background: RED, color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer',
              }}>
                Create request
              </button>
            </div>
          )}

          {!loading && active.map((req, i) => (
            <div key={req._id}
              onClick={() => navigate(`/blood-requests/${req._id}`)}
              style={{
                padding: '16px 20px',
                borderBottom: i < active.length - 1 ? `1px solid ${BORDER}` : 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                  RP-{req._id.slice(-4).toUpperCase()}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  ...STATUS_STYLE[req.status],
                }}>
                  {STATUS_LABEL[req.status]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: '#fef2f2', color: RED,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {req.bloodGroup}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{req.hospitalName}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                    {req.unitsRequired} unit{req.unitsRequired !== 1 ? 's' : ''} required · Needed {new Date(req.requiredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              {/* Urgency badge */}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                ...URGENCY_STYLE[req.urgency],
              }}>
                {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Latest updates */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Latest updates</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Stay close to every response</p>
            </div>
            <button onClick={() => navigate('/notifications')} style={{
              background: 'none', border: 'none', fontSize: 12, color: RED, cursor: 'pointer', fontWeight: 600,
            }}>
              See all
            </button>
          </div>
          {MOCK_UPDATES.map((n, i) => (
            <div key={n.id} style={{
              padding: '14px 20px',
              borderBottom: i < MOCK_UPDATES.length - 1 ? `1px solid ${BORDER}` : 'none',
              display: 'flex', gap: 12,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>🔔</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{n.title}</p>
                <p style={{ margin: '3px 0 4px', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                  {n.desc.split(/(St\. Mary's Hospital|verified|4th donation)/).map((part, pi) =>
                    ['St. Mary\'s Hospital', 'verified', '4th donation'].includes(part)
                      ? <span key={pi} style={{ color: RED }}>{part}</span>
                      : part
                  )}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
