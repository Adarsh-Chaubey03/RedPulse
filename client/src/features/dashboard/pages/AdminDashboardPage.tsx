import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { listBloodRequests } from '../../blood-request/services/bloodRequestApi';
import { StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';
import type { BloodRequest, RequestStatus, Urgency } from '../../blood-request/types';

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

// ─── Bar chart (CSS-only) ─────────────────────────────────────────────────────
const CHART_DATA = [
  { label: 'Jan', v: 38 }, { label: 'Feb', v: 52 }, { label: 'Mar', v: 45 },
  { label: 'Apr', v: 68 }, { label: 'May', v: 61 }, { label: 'Jun', v: 79 },
  { label: 'Jul', v: 55 }, { label: 'Aug', v: 72 }, { label: 'Sep', v: 84 },
  { label: 'Oct', v: 66 }, { label: 'Nov', v: 91 }, { label: 'Dec', v: 88 },
];
const MAX_V = Math.max(...CHART_DATA.map(d => d.v));

const VERIF_QUEUE = [
  { initial: 'D', name: 'Daniel Kim',   role: 'Donor',    time: 'Submitted 1h ago' },
  { initial: 'L', name: 'Leila Chen',   role: 'Hospital', time: 'Submitted 2h ago' },
  { initial: 'M', name: 'Marcus Reed',  role: 'Hospital', time: 'Submitted 3h ago' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBloodRequests({ limit: 5 });
      setRequests(res.data.requests);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const firstName = user?.firstName ?? 'Alex';
  const active    = requests.filter(r => r.status === 'searching' || r.status === 'partiallyFulfilled');

  return (
    <div style={{ maxWidth: 980 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Admin overview</span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>{greeting()}, {firstName}</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>A clear view of the <span style={{ color: RED }}>RedPulse</span> network and its impact.</p>
        </div>
        <button onClick={() => navigate('/admin/analytics')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: RED, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ⚡ View analytics →
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="👥" label="Total users"       value="12,480" sub="+8.4% this month"   iconBg="#fef2f2" iconColor={RED}     />
        <StatCard icon="❤"  label="Active donors"     value="8,924"  sub="71.5% of network"   iconBg="#fef2f2" iconColor={RED}     />
        <StatCard icon="⚡" label="Active requests"   value={loading ? '…' : active.length || 184} sub={`${active.filter(r=>r.urgency==='critical').length || 28} critical`} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard icon="✅" label="Fulfilment rate"   value="92.4%"  sub="+4.2% this month"   iconBg="#f0fdf4" iconColor="#16a34a" />
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
        {/* Bar chart */}
        <SectionCard>
          <CardHeader title="Network activity" subtitle="Requests and successful connections · Demo data" actionLabel="Full analytics" actionPath="/admin/analytics" />
          <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'flex-end', gap: 6, height: 180 }}>
            {CHART_DATA.map(d => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: RED, opacity: 0.7 + (d.v / MAX_V) * 0.3, height: `${(d.v / MAX_V) * 120}px`, transition: 'height 0.3s' }} />
                <span style={{ fontSize: 9, color: '#9ca3af' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Verification queue */}
        <SectionCard>
          <CardHeader title="Verification queue" subtitle="Review new submissions" actionLabel="Review all" actionPath="/admin/verification" />
          {VERIF_QUEUE.map((item, i) => (
            <div key={i} onClick={() => navigate('/admin/verification')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < VERIF_QUEUE.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0 }}>{item.initial}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: '#6b7280' }}>{item.role} · {item.time}</p>
              </div>
              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fffbeb', color: '#d97706' }}>Pending</span>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Recent emergency requests — full-width */}
      <SectionCard>
        <CardHeader title="Recent emergency requests" subtitle="Network-wide request activity" actionLabel="View all" actionPath="/blood-requests" />
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#f9fafb' }}>
          {['REQUEST','BLOOD GROUP','LOCATION','URGENCY','STATUS',''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>
        {loading && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}
        {!loading && requests.length === 0 && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>No requests found.</p>}
        {!loading && requests.map((req, i) => (
          <div key={req._id} onClick={() => navigate(`/blood-requests/${req._id}`)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px', padding: '14px 20px', borderBottom: i < requests.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>RP-{req._id.slice(-4).toUpperCase()}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: RED }}>{formatTime(req.requiredAt)}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>{req.bloodGroup}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{req.unitsRequired} units</p>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>{req.hospitalName}</p>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...URGENCY_STYLE[req.urgency as Urgency] }}>{URGENCY_LABEL[req.urgency as Urgency]}</span>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[req.status] }}>{STATUS_LABEL[req.status]}</span>
            <span style={{ color: '#9ca3af', fontSize: 16, textAlign: 'right' }}>→</span>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
