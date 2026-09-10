import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { listBloodRequests } from '../../blood-request/services/bloodRequestApi';
import { getRequestResponses } from '../../blood-request/services/donorApi';
import { StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';
import MapPanel, { bloodRequestToMarker } from '../components/MapPanel';
import type { BloodRequest, RequestStatus, Urgency, DonorResponse } from '../../blood-request/types';

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
const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critical', urgent: 'Urgent', normal: 'Standard',
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso); const today = new Date(); const tom = new Date(today);
  tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())
    return `Needed today, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === tom.toDateString())
    return `Tomorrow, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HospitalDashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [requests,    setRequests]    = useState<BloodRequest[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Donor responses fetched from the most recent active request
  const [responses,   setResponses]   = useState<DonorResponse[]>([]);
  const [respLoading, setRespLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await listBloodRequests({ requestedBy: user._id, limit: 20 });
      const reqs: BloodRequest[] = res.data.requests;
      setRequests(reqs);

      // Fetch donor responses for the most recently active request
      const activeReq = reqs.find(r => r.status === 'searching' || r.status === 'partiallyFulfilled');
      if (activeReq) {
        setRespLoading(true);
        try {
          const respRes = await getRequestResponses(activeReq._id);
          // getRequestResponses returns full BloodRequest with donorResponses embedded
          const fullReq = respRes.data as BloodRequest;
          setResponses(fullReq.donorResponses ?? []);
        } catch {
          setResponses([]);
        } finally {
          setRespLoading(false);
        }
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]); // load is stable via useCallback

  const active    = requests.filter(r => r.status === 'searching' || r.status === 'partiallyFulfilled');
  const fulfilled = requests.filter(r => r.status === 'fulfilled');
  const pct       = requests.length ? Math.round((fulfilled.length / requests.length) * 100) : 0;
  const totalUnits = requests.reduce((s, r) => s + r.unitsRequired, 0);

  // Build map markers from active requests
  const requestMarkers = active
    .filter(r => r.hospitalLocation?.coordinates?.length === 2)
    .map(bloodRequestToMarker);

  // Center map on first active request or default
  const mapCenter = requestMarkers[0]
    ? { lat: requestMarkers[0].lat, lng: requestMarkers[0].lng }
    : { lat: 20, lng: 0 };

  return (
    <div style={{ maxWidth: 980 }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
            Hospital dashboard
          </span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            {greeting()}, care team
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Coordinate urgent blood needs across your <span style={{ color: RED }}>hospital</span>.
          </p>
        </div>
        <button onClick={() => navigate('/blood-requests/new')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: RED, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ⚡ Create blood request →
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard
          icon="⚡" label="Active requests"
          value={loading ? '…' : active.length}
          sub={`${active.filter(r => r.urgency === 'critical').length} critical today`}
          iconBg="#fef2f2" iconColor={RED}
        />
        <StatCard
          icon="👥" label="Total units needed"
          value={loading ? '…' : totalUnits}
          sub="Across all active requests"
          iconBg="#eff6ff" iconColor="#2563eb"
        />
        <StatCard
          icon="✅" label="Fulfilment rate"
          value={loading ? '…' : `${pct}%`}
          sub={pct >= 80 ? 'Above 80% goal' : 'Below 80% goal'}
          iconBg="#f0fdf4" iconColor="#16a34a"
        />
        <StatCard
          icon="🔔" label="Donor responses"
          value={respLoading ? '…' : responses.length}
          sub="On most recent request"
          iconBg="#fffbeb" iconColor="#d97706"
        />
      </div>

      {/* ── Requests needing attention ───────────────────────────────────── */}
      <SectionCard style={{ marginBottom: 20 }}>
        <CardHeader
          title="Requests needing attention"
          subtitle="Prioritized by urgency and response status"
          actionLabel="Manage requests"
          actionPath="/blood-requests"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#f9fafb' }}>
          {['REQUEST', 'BLOOD GROUP', 'LOCATION', 'URGENCY', 'STATUS', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {loading && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}
        {!loading && active.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No active requests.</p>
            <button onClick={() => navigate('/blood-requests/new')} style={{ marginTop: 10, padding: '8px 18px', borderRadius: 7, background: RED, color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer' }}>
              Create request
            </button>
          </div>
        )}

        {!loading && active.slice(0, 5).map((req, i) => (
          <div key={req._id}
            onClick={() => navigate(`/blood-requests/${req._id}`)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px', padding: '14px 20px', borderBottom: i < Math.min(active.length, 5) - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
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
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...URGENCY_STYLE[req.urgency as Urgency] }}>
              {URGENCY_LABEL[req.urgency as Urgency] ?? req.urgency}
            </span>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[req.status] }}>
              {STATUS_LABEL[req.status]}
            </span>
            <span style={{ color: '#9ca3af', fontSize: 16, textAlign: 'right' }}>→</span>
          </div>
        ))}
      </SectionCard>

      {/* ── Bottom row: real donor responses + real map ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

        {/* Real donor responses from API */}
        <SectionCard>
          <CardHeader
            title="Donor responses"
            subtitle={respLoading ? 'Loading…' : responses.length > 0 ? `${responses.length} response${responses.length !== 1 ? 's' : ''} on latest request` : 'No responses yet'}
          />

          {respLoading && <p style={{ padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading responses…</p>}

          {!respLoading && responses.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>
                {active.length > 0
                  ? 'No donor responses yet for your active requests.'
                  : 'Create a blood request to start receiving donor responses.'}
              </p>
            </div>
          )}

          {!respLoading && responses.map((resp, i) => {
            const initial = resp.donorName?.[0]?.toUpperCase() ?? '?';
            return (
              <div key={resp._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px',
                borderBottom: i < responses.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#fef2f2', color: RED,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {initial}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {resp.donorName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
                    {resp.bloodGroup} donor
                    {resp.note ? ` · "${resp.note}"` : ''}
                  </p>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: resp.status === 'accepted' ? '#f0fdf4' : '#f3f4f6',
                  color: resp.status === 'accepted' ? '#16a34a' : '#6b7280',
                }}>
                  {resp.status.charAt(0).toUpperCase() + resp.status.slice(1)}
                </span>
              </div>
            );
          })}
        </SectionCard>

        {/* Real map with request locations */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Active requests map</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                {loading ? 'Loading…' : `${requestMarkers.length} location${requestMarkers.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <span style={{ fontSize: 16 }}>📍</span>
          </div>
          <MapPanel
            height={220}
            center={mapCenter}
            zoom={requestMarkers.length > 0 ? 11 : 2}
            requestMarkers={requestMarkers}
            onRequestClick={r => navigate(`/blood-requests/${r.id}`)}
          />
          <div style={{ padding: '12px 20px' }}>
            <button onClick={() => navigate('/blood-requests')} style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, color: '#374151', cursor: 'pointer',
            }}>
              Manage all requests →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
