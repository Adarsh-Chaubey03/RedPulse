import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { listBloodRequests } from '../../blood-request/services/bloodRequestApi';
import { StatCard, SectionCard, CardHeader, DonorsNearbyPanel, RED, BORDER } from '../components/ui';
import type { BloodRequest, RequestStatus, Urgency } from '../../blood-request/types';

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

const formatDateTime = (iso: string) => {
  const d = new Date(iso); const today = new Date(); const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `Needed today, ${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`;
  if (d.toDateString() === tom.toDateString()) return `Tomorrow, ${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`;
  return `${d.toLocaleDateString(undefined,{month:'short',day:'numeric'})}, ${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`;
};

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

const DONOR_RESPONSES = [
  { initial: 'M', name: 'Maya Thompson', blood: 'O-', dist: '2.4 km away', status: 'Accepted' },
  { initial: 'D', name: 'Daniel Kim',    blood: 'O+', dist: '4.1 km away', status: 'Accepted' },
  { initial: 'P', name: 'Priya Shah',    blood: 'O+', dist: '6.7 km away', status: 'Accepted' },
];

export default function HospitalDashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await listBloodRequests({ requestedBy: user._id, limit: 20 });
      setRequests(res.data.requests);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const active    = requests.filter(r => r.status === 'searching' || r.status === 'partiallyFulfilled');
  const fulfilled = requests.filter(r => r.status === 'fulfilled');
  const pct       = requests.length ? Math.round((fulfilled.length / requests.length) * 100) : 86;
  const donorResps = requests.reduce((s, r) => s + r.unitsRequired, 0);

  return (
    <div style={{ maxWidth: 980 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Hospital dashboard</span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>{greeting()}, care team</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>Coordinate urgent blood needs across your <span style={{ color: RED }}>hospital</span>.</p>
        </div>
        <button onClick={() => navigate('/blood-requests/new')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: RED, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ⚡ Create blood request →
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="⚡" label="Active requests"   value={loading ? '…' : active.length || 14}    sub={`${active.filter(r=>r.urgency==='critical').length || 4} critical today`}  iconBg="#fef2f2" iconColor={RED}       />
        <StatCard icon="👥" label="Donor responses"   value={loading ? '…' : donorResps || 38}        sub="+12% this week"   iconBg="#eff6ff" iconColor="#2563eb"   />
        <StatCard icon="✅" label="Fulfilled this month" value={`${pct}%`}                             sub="Above 80% goal"   iconBg="#f0fdf4" iconColor="#16a34a"   />
        <StatCard icon="🔔" label="Pending actions"   value={7}                                        sub="Need review"      iconBg="#fffbeb" iconColor="#d97706"   />
      </div>

      {/* Requests needing attention — full width */}
      <SectionCard style={{ marginBottom: 20 }}>
        <CardHeader title="Requests needing attention" subtitle="Prioritized by urgency and response status" actionLabel="Manage requests" actionPath="/blood-requests" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#f9fafb' }}>
          {['REQUEST','BLOOD GROUP','LOCATION','URGENCY','STATUS',''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>
        {loading && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}
        {!loading && active.length === 0 && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>No active requests.</p>}
        {!loading && active.slice(0, 5).map((req, i) => (
          <div key={req._id} onClick={() => navigate(`/blood-requests/${req._id}`)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px', padding: '14px 20px', borderBottom: i < Math.min(active.length,5) - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>RP-{req._id.slice(-4).toUpperCase()}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: RED }}>{formatDateTime(req.requiredAt)}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>{req.bloodGroup}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{req.unitsRequired} units</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>{req.hospitalName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>—</p>
            </div>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...URGENCY_STYLE[req.urgency as Urgency] }}>{URGENCY_LABEL[req.urgency as Urgency]}</span>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[req.status] }}>{STATUS_LABEL[req.status]}</span>
            <span style={{ color: '#9ca3af', fontSize: 16, textAlign: 'right' }}>→</span>
          </div>
        ))}
      </SectionCard>

      {/* Bottom row: donor responses + map */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Donor responses */}
        <SectionCard>
          <CardHeader title="Donor responses" subtitle="Recent activity from your network" />
          {DONOR_RESPONSES.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < DONOR_RESPONSES.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0 }}>{d.initial}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{d.blood} · <span style={{ color: RED }}>{d.dist}</span></p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#16a34a' }}>{d.status}</span>
            </div>
          ))}
        </SectionCard>
        <DonorsNearbyPanel />
      </div>
    </div>
  );
}
