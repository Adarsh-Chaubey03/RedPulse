import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { getAdminStats, getPendingVerification } from '../services/adminApi';
import { listBloodRequests } from '../../blood-request/services/bloodRequestApi';
import { StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';
import type { BloodRequest, RequestStatus, Urgency } from '../../blood-request/types';
import type { PlatformStats, AdminUser } from '../services/adminApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<RequestStatus, React.CSSProperties> = {
  searching:          { background: '#eff6ff', color: '#2563eb' },
  partiallyFulfilled: { background: '#fffbeb', color: '#d97706' },
  fulfilled:          { background: '#f0fdf4', color: '#16a34a' },
  expired:            { background: '#f3f4f6', color: '#6b7280' },
  cancelled:          { background: '#fef2f2', color: RED },
};
const STATUS_LABEL: Record<RequestStatus, string> = {
  searching: 'Searching', partiallyFulfilled: 'Partially Fulfilled',
  fulfilled: 'Fulfilled', expired: 'Expired', cancelled: 'Cancelled',
};
const URGENCY_STYLE: Record<Urgency, React.CSSProperties> = {
  critical: { background: '#fef2f2', color: RED },
  urgent:   { background: '#fffbeb', color: '#d97706' },
  normal:   { background: '#f0fdf4', color: '#16a34a' },
};
const URGENCY_LABEL: Record<Urgency, string> = { critical: 'Critical', urgent: 'Urgent', normal: 'Standard' };

const formatTime = (iso: string) => {
  const d = new Date(iso); const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

const ROLE_INIT: Record<string, string> = {
  donor: 'D', patient: 'P', hospital: 'H', bloodBank: 'B', admin: 'A',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [stats,    setStats]    = useState<PlatformStats | null>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [pending,  setPending]  = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reqRes, pendRes] = await Promise.all([
        getAdminStats(),
        listBloodRequests({ limit: 5 }),
        getPendingVerification(),
      ]);
      setStats(statsRes.data);
      setRequests(reqRes.data.requests);
      setPending(pendRes.data.slice(0, 3));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const firstName = user?.firstName ?? 'Admin';
  const criticalCount = requests.filter(r => r.urgency === 'critical' && (r.status === 'searching' || r.status === 'partiallyFulfilled')).length;

  const fulfillmentRate = stats
    ? (stats.requests.total > 0
        ? Math.round((stats.requests.fulfilled / stats.requests.total) * 100)
        : 0)
    : 0;

  return (
    <div style={{ maxWidth: 980 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Admin overview</span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>{greeting()}, {firstName}</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>A clear view of the <span style={{ color: RED }}>RedPulse</span> network and its impact.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => load()} style={{ padding: '10px 16px', borderRadius: 8, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <button onClick={() => navigate('/admin/analytics')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: RED, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ⚡ Analytics →
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: RED }}>
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="👥" label="Total users"       value={loading ? '…' : (stats?.users.total ?? 0).toLocaleString()} sub={loading ? '' : `${(stats?.users.donors ?? 0).toLocaleString()} donors`}           iconBg="#fef2f2" iconColor={RED}     />
        <StatCard icon="🏥" label="Organizations"     value={loading ? '…' : ((stats?.users.hospitals ?? 0) + (stats?.users.bloodBanks ?? 0)).toLocaleString()} sub={loading ? '' : `${stats?.users.hospitals ?? 0} hospitals · ${stats?.users.bloodBanks ?? 0} blood banks`} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard icon="⚡" label="Active requests"   value={loading ? '…' : (stats?.requests.active ?? 0).toLocaleString()} sub={loading ? '' : `${criticalCount} critical`} iconBg="#fffbeb" iconColor="#d97706" />
        <StatCard icon="✅" label="Fulfilment rate"   value={loading ? '…' : `${fulfillmentRate}%`} sub={loading ? '' : `${(stats?.requests.fulfilled ?? 0)} of ${stats?.requests.total ?? 0} requests`} iconBg="#f0fdf4" iconColor="#16a34a" />
      </div>

      {/* Secondary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🩸" label="Donors"            value={loading ? '…' : (stats?.users.donors ?? 0).toLocaleString()}            sub="Registered donors"           iconBg="#fef2f2" iconColor={RED}     />
        <StatCard icon="🧑‍⚕️" label="Patients"          value={loading ? '…' : (stats?.users.patients ?? 0).toLocaleString()}          sub="Registered patients"         iconBg="#f0fdf4" iconColor="#16a34a" />
        <StatCard icon="⏳" label="Pending verif."    value={loading ? '…' : (stats?.requests.pendingVerification ?? 0).toLocaleString()} sub="Awaiting admin review"    iconBg="#fffbeb" iconColor="#d97706" />
        <StatCard icon="❌" label="Expired / Cancelled" value={loading ? '…' : ((stats?.requests.expired ?? 0) + (stats?.requests.cancelled ?? 0)).toLocaleString()} sub={loading ? '' : `${stats?.requests.expired ?? 0} expired · ${stats?.requests.cancelled ?? 0} cancelled`} iconBg="#f3f4f6" iconColor="#6b7280" />
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
        {/* Recent requests */}
        <SectionCard>
          <CardHeader title="Recent blood requests" subtitle="Network-wide activity" actionLabel="View all" actionPath="/blood-requests" />
          {loading && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}
          {!loading && requests.length === 0 && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>No requests found.</p>}
          {!loading && requests.map((req, i) => (
            <div key={req._id} onClick={() => navigate(`/blood-requests/${req._id}`)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr', padding: '12px 20px', borderBottom: i < requests.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>RP-{req._id.slice(-4).toUpperCase()}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{req.hospitalName}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>{req.bloodGroup}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{req.unitsRequired}u</p>
              </div>
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...URGENCY_STYLE[req.urgency as Urgency] }}>
                {URGENCY_LABEL[req.urgency as Urgency]}
              </span>
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[req.status] }}>
                {STATUS_LABEL[req.status]}
              </span>
            </div>
          ))}
        </SectionCard>

        {/* Verification queue */}
        <SectionCard>
          <CardHeader
            title="Verification queue"
            subtitle={loading ? 'Loading…' : `${stats?.requests.pendingVerification ?? 0} pending`}
            actionLabel="Review all"
            actionPath="/admin/verification"
          />
          {loading && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}
          {!loading && pending.length === 0 && (
            <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>✓ No pending verifications.</p>
          )}
          {!loading && pending.map((item, i) => {
            const name = item.organizationName
              ? item.organizationName
              : `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.email;
            const initial = (item.organizationName?.[0] ?? item.firstName?.[0] ?? item.email[0]).toUpperCase();
            const roleInit = ROLE_INIT[item.role] ?? '?';
            return (
              <div key={item._id} onClick={() => navigate('/admin/verification')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < pending.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                  {initial || roleInit}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{item.role} · {formatTime(item.createdAt)}</p>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fffbeb', color: '#d97706', flexShrink: 0 }}>Pending</span>
              </div>
            );
          })}
          {!loading && pending.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => navigate('/admin/verification')} style={{ background: 'none', border: 'none', fontSize: 12, color: RED, cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                View all pending →
              </button>
            </div>
          )}
        </SectionCard>
      </div>

      {/* User breakdown */}
      <SectionCard>
        <CardHeader title="User breakdown" subtitle="By role across the network" actionLabel="Manage users" actionPath="/admin/users" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
          {[
            { label: 'Donors',      value: stats?.users.donors    ?? 0, color: RED,      bg: '#fef2f2' },
            { label: 'Patients',    value: stats?.users.patients  ?? 0, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Hospitals',   value: stats?.users.hospitals ?? 0, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Blood Banks', value: stats?.users.bloodBanks ?? 0, color: '#d97706', bg: '#fffbeb' },
            { label: 'Admins',      value: stats?.users.admins    ?? 0, color: '#6b7280', bg: '#f3f4f6' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ padding: '20px', borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: loading ? '#d1d5db' : item.color }}>
                {loading ? '…' : item.value.toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{item.label}</p>
              <div style={{ marginTop: 8, height: 4, background: item.bg, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
