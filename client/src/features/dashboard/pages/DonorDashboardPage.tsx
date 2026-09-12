import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { updateMyAvailability } from '../../profile/services/profileApi';
import { discoverBloodRequests } from '../../blood-request/services/donorApi';
import { StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';
import MapPanel, { bloodRequestToMarker } from '../components/MapPanel';
import type { RequestMarker } from '../components/MapPanel';
import type { BloodRequest, RequestStatus, Urgency } from '../../blood-request/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const URGENCY_STYLE: Record<Urgency, React.CSSProperties> = {
  critical: { background: '#fef2f2', color: RED },
  urgent:   { background: '#fffbeb', color: '#d97706' },
  normal:   { background: '#f0fdf4', color: '#16a34a' },
};
const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critical', urgent: 'Urgent', normal: 'Standard',
};
const STATUS_STYLE: Record<RequestStatus, React.CSSProperties> = {
  searching:          { background: '#eff6ff', color: '#2563eb' },
  partiallyFulfilled: { background: '#fffbeb', color: '#d97706' },
  fulfilled:          { background: '#f0fdf4', color: '#16a34a' },
  expired:            { background: '#f3f4f6', color: '#6b7280' },
  cancelled:          { background: '#fef2f2', color: RED },
};
const STATUS_LABEL: Record<RequestStatus, string> = {
  searching: 'Searching', partiallyFulfilled: 'Partial', fulfilled: 'Fulfilled',
  expired: 'Expired', cancelled: 'Cancelled',
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
const formatDateTime = (iso: string) => {
  const d = new Date(iso); const today = new Date(); const tom = new Date();
  tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())
    return `Today, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === tom.toDateString())
    return `Tomorrow, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DonorDashboardPage() {
  // Select individual slices rather than the whole store: the auth store's
  // accessToken rotates on every refresh, and a whole-store subscription would
  // re-render this page (and remount every map marker) each time it did.
  const user    = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const navigate = useNavigate();

  const [availLoading, setAvailLoading] = useState(false);
  const [availError,   setAvailError]   = useState('');

  // Compatible blood requests from /api/blood-requests/discover
  const [requests,  setRequests]  = useState<BloodRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqError,   setReqError]   = useState('');
  const [reqTotal,   setReqTotal]   = useState(0);

  // ── Availability toggle (already real API) ────────────────────────────────
  const handleAvailability = async () => {
    setAvailLoading(true); setAvailError('');
    try {
      const res = await updateMyAvailability(!user!.isAvailable);
      setUser(res.data);
    } catch (err: unknown) {
      setAvailError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update availability.',
      );
    } finally { setAvailLoading(false); }
  };

  // ── Discover compatible requests ──────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    setReqLoading(true); setReqError('');
    try {
      const res = await discoverBloodRequests({ page: 1, limit: 10 });
      const data = res.data as { requests: BloodRequest[]; meta: { total: number } };
      setRequests(data.requests);
      setReqTotal(data.meta.total);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? '';
      setReqError(msg || 'Unable to load compatible requests.');
    } finally { setReqLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadRequests(); }, [loadRequests]); // loadRequests is stable via useCallback

  // ── Map inputs ────────────────────────────────────────────────────────────
  // These feed <MapPanel>. Recomputing them inline on every render handed the
  // map a new array + new position objects each time, which made it re-apply
  // every AdvancedMarker. Same values, stable identities.
  const userLocation = user?.location;

  // Build request markers for map (only requests with valid coords)
  const requestMarkers = useMemo(
    () => requests
      .filter(r => r.hospitalLocation?.coordinates?.length === 2)
      .map(bloodRequestToMarker),
    [requests],
  );

  // Center map on user's stored location or first request location
  const mapCenter = useMemo(
    () => userLocation
      ? { lat: userLocation.coordinates[1], lng: userLocation.coordinates[0] }
      : requestMarkers[0]
      ? { lat: requestMarkers[0].lat, lng: requestMarkers[0].lng }
      : { lat: 20, lng: 0 },
    [userLocation, requestMarkers],
  );

  const centerPoint = useMemo(
    () => userLocation
      ? { lat: userLocation.coordinates[1], lng: userLocation.coordinates[0], label: 'Your location' }
      : undefined,
    [userLocation],
  );

  const handleRequestClick = useCallback(
    (req: RequestMarker) => navigate(`/blood-requests/${req.id}`),
    [navigate],
  );

  // All hooks done — now safe to conditionally return
  if (!user) return null;
  const firstName = user.firstName ?? 'Donor';

  return (
    <div style={{ maxWidth: 960 }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
            Donor dashboard
          </span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            {greeting()}, {firstName}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Your <span style={{ color: RED }}>availability</span> and compatible requests nearby.
          </p>
        </div>
        <button onClick={handleAvailability} disabled={availLoading} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 8,
          background: user.isAvailable ? '#16a34a' : '#6b7280',
          color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
          cursor: availLoading ? 'not-allowed' : 'pointer', flexShrink: 0,
        }}>
          {availLoading ? '…' : user.isAvailable ? '✓ Available to donate' : 'Mark as available'}
        </button>
      </div>
      {availError && <p style={{ color: RED, fontSize: 13, marginBottom: 16 }}>{availError}</p>}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🔔" label="Open requests"   value={reqLoading ? '…' : reqTotal}         sub="Compatible with your blood group" iconBg="#fef2f2" iconColor={RED}       />
        <StatCard icon="📍" label="Location"         value={user.location ? '✓ Set' : '—'}       sub={user.location ? 'Visible to hospitals' : 'Not set yet'}                 iconBg="#eff6ff" iconColor="#2563eb"   />
        <StatCard icon="🛡" label="Verification"     value={user.isVerified ? '✓' : 'Pending'}   sub={user.isVerified ? 'Verified donor' : 'Not yet verified'}                 iconBg="#f0fdf4" iconColor="#16a34a"   />
        <StatCard icon="🩸" label="Blood group"      value={user.bloodGroup ?? '—'}               sub="Your donor type"                                                         iconBg="#fef2f2" iconColor={RED}       />
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

        {/* Compatible requests list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard>
            <CardHeader
              title="Compatible blood requests"
              subtitle={reqLoading ? 'Loading…' : `${reqTotal} request${reqTotal !== 1 ? 's' : ''} matching your blood group`}
              actionLabel="View all"
              actionPath="/blood-requests"
            />

            {reqLoading && (
              <p style={{ padding: '24px 20px', color: '#9ca3af', fontSize: 13 }}>Loading compatible requests…</p>
            )}

            {!reqLoading && reqError && (
              <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>
                  {user.isAvailable
                    ? reqError
                    : 'Mark yourself as available to see compatible blood requests.'}
                </p>
                {!user.isAvailable && (
                  <button onClick={handleAvailability} disabled={availLoading} style={{
                    marginTop: 12, padding: '8px 18px', borderRadius: 7,
                    background: '#16a34a', color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Mark as available
                  </button>
                )}
              </div>
            )}

            {!reqLoading && !reqError && requests.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>No compatible requests found in your area.</p>
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
                  Make sure your location and blood group are set in your profile.
                </p>
                <button onClick={() => navigate('/profile')} style={{
                  marginTop: 12, padding: '8px 18px', borderRadius: 7,
                  background: RED, color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Update profile →
                </button>
              </div>
            )}

            {!reqLoading && !reqError && requests.map((req, i) => (
              <div key={req._id}
                onClick={() => navigate(`/blood-requests/${req._id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < requests.length - 1 ? `1px solid ${BORDER}` : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Blood group badge */}
                <span style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#fef2f2', color: RED,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {req.bloodGroup}
                </span>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {req.hospitalName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                    {req.unitsRequired} unit{req.unitsRequired !== 1 ? 's' : ''} · {formatDateTime(req.requiredAt)}
                  </p>
                </div>

                {/* Urgency */}
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
                  ...URGENCY_STYLE[req.urgency as Urgency],
                }}>
                  {URGENCY_LABEL[req.urgency as Urgency] ?? req.urgency}
                </span>

                {/* Status */}
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
                  ...STATUS_STYLE[req.status],
                }}>
                  {STATUS_LABEL[req.status]}
                </span>

                <span style={{ color: '#9ca3af', fontSize: 14 }}>→</span>
              </div>
            ))}
          </SectionCard>

          {/* Profile summary */}
          <SectionCard>
            <CardHeader title="Your profile" subtitle="Keep your information up to date" actionLabel="Edit profile" actionPath="/profile" />
            <div style={{ padding: '20px', display: 'grid', gap: 12 }}>
              {[
                ['Name',         `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'],
                ['Email',        user.email],
                ['Blood group',  user.bloodGroup ?? '—'],
                ['Availability', user.isAvailable ? 'Available' : 'Unavailable'],
                ['Profile',      user.isProfileComplete ? 'Complete' : 'Incomplete'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${BORDER}`, fontSize: 14 }}>
                  <span style={{ width: 110, color: '#6b7280', fontSize: 13, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{v}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right: map showing request locations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Requests near you</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                  {reqLoading ? 'Loading…' : `${requestMarkers.length} request${requestMarkers.length !== 1 ? 's' : ''} on map`}
                </p>
              </div>
              <span style={{ fontSize: 16 }}>📍</span>
            </div>
            <MapPanel
              height={260}
              center={mapCenter}
              zoom={user.location ? 11 : 2}
              centerPoint={centerPoint}
              requestMarkers={requestMarkers}
              onRequestClick={handleRequestClick}
            />
            <div style={{ padding: '12px 20px' }}>
              <button onClick={() => navigate('/blood-requests')} style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 13, color: '#374151', cursor: 'pointer',
              }}>
                View all requests →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
