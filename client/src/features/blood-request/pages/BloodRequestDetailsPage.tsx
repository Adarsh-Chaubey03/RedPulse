import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBloodRequest, updateBloodRequestStatus, cancelBloodRequest } from '../services/bloodRequestApi';
import { useAuthStore } from '../../auth/store/authStore';
import type { BloodRequest, RequestStatus } from '../types';
import { ALLOWED_TRANSITIONS } from '../types/transitions';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED    = '#c0392b';
const BORDER = '#e5e7eb';

// ─── Status styling ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<RequestStatus, { bg: string; color: string }> = {
  searching:          { bg: '#eff6ff', color: '#2563eb' },
  partiallyFulfilled: { bg: '#fffbeb', color: '#d97706' },
  fulfilled:          { bg: '#f0fdf4', color: '#16a34a' },
  expired:            { bg: '#f3f4f6', color: '#6b7280' },
  cancelled:          { bg: '#fef2f2', color: RED },
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  searching:          'Searching for donors',
  partiallyFulfilled: 'Partially fulfilled',
  fulfilled:          'Fulfilled',
  expired:            'Expired',
  cancelled:          'Cancelled',
};

const URGENCY_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  critical: { label: 'Critical',  bg: '#fef2f2', color: RED,      dot: '🔴' },
  urgent:   { label: 'Urgent',    bg: '#fffbeb', color: '#d97706', dot: '🟡' },
  normal:   { label: 'Standard',  bg: '#f0fdf4', color: '#16a34a', dot: '🟢' },
};

const TIMELINE_STEPS: RequestStatus[] = ['searching', 'partiallyFulfilled', 'fulfilled'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{
    display: 'flex', gap: '1rem',
    borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.6rem',
  }}>
    <span style={{ width: 160, color: '#6b7280', flexShrink: 0, fontSize: 13 }}>{label}</span>
    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value}</span>
  </div>
);

/** Formats milliseconds remaining into a human-readable countdown. */
const formatCountdown = (ms: number): { text: string; urgent: boolean } => {
  if (ms <= 0) return { text: 'Expired', urgent: true };
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 48) return { text: `${Math.floor(h / 24)}d remaining`, urgent: false };
  if (h > 0)  return { text: `${h}h ${m}m remaining`, urgent: h < 6 };
  return { text: `${m}m remaining`, urgent: true };
};

// ─── Expiry countdown component ───────────────────────────────────────────────
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [ms, setMs] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      setMs(new Date(expiresAt).getTime() - Date.now());
    }, 30_000); // update every 30 s
    return () => clearInterval(tick);
  }, [expiresAt]);

  const { text, urgent } = formatCountdown(ms);
  const expired = ms <= 0;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: expired ? '#f3f4f6' : urgent ? '#fef2f2' : '#fffbeb',
      color:      expired ? '#6b7280' : urgent ? RED      : '#d97706',
      border:     expired ? `1px solid ${BORDER}` : urgent ? '1px solid #fecaca' : '1px solid #fde68a',
    }}>
      {expired ? '⏱' : '⏳'} {text}
    </span>
  );
}

// ─── Fulfillment progress bar ─────────────────────────────────────────────────
function FulfillmentBar({ fulfilled, required }: { fulfilled: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((fulfilled / required) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Units fulfilled</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? '#16a34a' : '#111827' }}>
          {fulfilled} / {required}
        </span>
      </div>
      <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`,
          background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#d97706' : RED,
          transition: 'width 0.4s',
        }} />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BloodRequestDetailsPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);

  const [request,       setRequest]       = useState<BloodRequest | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [actionError,   setActionError]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getBloodRequest(id)
      .then(res => setRequest(res.data))
      .catch(() => setError('Blood request not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ padding: '3rem 2rem', color: '#9ca3af', fontSize: 14 }}>Loading…</p>;
  if (error || !request) {
    return (
      <div style={{ maxWidth: 600, padding: '2rem' }}>
        <p style={{ color: RED }}>{error || 'Request not found.'}</p>
        <button onClick={() => navigate('/blood-requests')}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: 7, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 13 }}>
          ← Back to requests
        </button>
      </div>
    );
  }

  const requestedById = typeof request.requestedBy === 'string'
    ? request.requestedBy
    : request.requestedBy._id;

  const isOwner   = user?._id === requestedById;
  const isAdmin   = user?.role === 'admin';
  const canModify = isOwner || isAdmin;

  const statusColors = STATUS_COLORS[request.status] ?? { bg: '#f0f0f0', color: '#333' };
  const urgencyCfg   = URGENCY_CONFIG[request.urgency] ?? URGENCY_CONFIG.normal;
  const allowedNext  = ALLOWED_TRANSITIONS[request.status] ?? [];
  const canCancel    = canModify && !['fulfilled', 'expired', 'cancelled'].includes(request.status);
  const isActive     = request.status === 'searching' || request.status === 'partiallyFulfilled';

  const [lng, lat] = request.hospitalLocation.coordinates;

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!id) return;
    setActionError('');
    setActionLoading(true);
    try {
      const res = await updateBloodRequestStatus(id, newStatus);
      setRequest(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e?.response?.data?.message || 'Unable to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm('Cancel this blood request?')) return;
    setActionError('');
    setActionLoading(true);
    try {
      const res = await cancelBloodRequest(id);
      setRequest(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e?.response?.data?.message || 'Unable to cancel request.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Back */}
      <button onClick={() => navigate('/blood-requests')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
        ← All requests
      </button>

      {/* Header card */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px', marginBottom: 16 }}>
        {/* Pill + urgency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusColors.bg, color: statusColors.color }}>
            {STATUS_LABELS[request.status]}
          </span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: urgencyCfg.bg, color: urgencyCfg.color }}>
            {urgencyCfg.dot} {urgencyCfg.label}
          </span>
          {/* Expiry countdown — only show for active requests */}
          {isActive && request.expiresAt && (
            <ExpiryCountdown expiresAt={request.expiresAt} />
          )}
          {!isActive && request.expiresAt && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              Expired {new Date(request.expiresAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
          {request.bloodGroup} · {request.bloodComponent}
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
          Request ID: RP-{request._id.slice(-6).toUpperCase()}
        </p>

        {/* Fulfillment bar */}
        <FulfillmentBar fulfilled={request.unitsFulfilled} required={request.unitsRequired} />
      </div>

      {/* Details card */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Request details
        </h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <Row label="Patient"         value={request.patientName} />
          <Row label="Blood group"     value={<span style={{ fontWeight: 700, color: RED }}>{request.bloodGroup}</span>} />
          <Row label="Component"       value={request.bloodComponent} />
          <Row label="Units required"  value={`${request.unitsRequired} unit${request.unitsRequired !== 1 ? 's' : ''}`} />
          <Row label="Units fulfilled" value={`${request.unitsFulfilled} unit${request.unitsFulfilled !== 1 ? 's' : ''}`} />
          <Row label="Hospital"        value={request.hospitalName} />
          <Row label="Location"        value={`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`} />
          <Row label="Required by"     value={new Date(request.requiredAt).toLocaleString()} />
          <Row label="Expires at"      value={request.expiresAt
            ? <span style={{ color: isActive && new Date(request.expiresAt) < new Date(Date.now() + 6 * 3600 * 1000) ? RED : '#374151' }}>
                {new Date(request.expiresAt).toLocaleString()}
              </span>
            : '—'}
          />
          <Row label="Urgency"         value={<span style={{ color: urgencyCfg.color, fontWeight: 600 }}>{urgencyCfg.dot} {urgencyCfg.label}</span>} />
          {request.additionalInformation && (
            <Row label="Notes" value={request.additionalInformation} />
          )}
          <Row label="Created"      value={new Date(request.createdAt).toLocaleString()} />
          <Row label="Last updated" value={new Date(request.updatedAt).toLocaleString()} />
        </div>
      </div>

      {/* Status timeline */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Status timeline
        </h3>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {TIMELINE_STEPS.map((step, idx) => {
            const stepIdx     = TIMELINE_STEPS.indexOf(request.status as RequestStatus);
            const isStepActive = step === request.status;
            const isDone       = stepIdx > idx;
            const isTerminal   = request.status === 'cancelled' || request.status === 'expired';
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', margin: '0 auto 6px',
                    background: isTerminal ? BORDER : isStepActive ? '#2563eb' : isDone ? '#16a34a' : BORDER,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isTerminal ? '#9ca3af' : (isStepActive || isDone) ? '#fff' : '#9ca3af',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: isStepActive ? '#2563eb' : '#9ca3af', fontWeight: isStepActive ? 600 : 400 }}>
                    {STATUS_LABELS[step]}
                  </p>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div style={{ height: 2, flex: 0.5, background: isDone && !isTerminal ? '#16a34a' : BORDER, marginBottom: 16 }} />
                )}
              </div>
            );
          })}
        </div>
        {(request.status === 'cancelled' || request.status === 'expired') && (
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, textAlign: 'center' }}>
            This request is <strong style={{ color: request.status === 'expired' ? '#6b7280' : RED }}>{request.status}</strong>.
          </p>
        )}
      </div>

      {/* Donor responses (owner / admin) */}
      {canModify && request.donorResponses.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Donor responses ({request.donorResponses.length})
          </h3>
          {request.donorResponses.map((r, i) => (
            <div key={r._id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < request.donorResponses.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: RED, flexShrink: 0 }}>
                {r.bloodGroup}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.donorName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
                  {new Date(r.respondedAt).toLocaleString()}
                  {r.note ? ` · "${r.note}"` : ''}
                </p>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: r.status === 'accepted' ? '#f0fdf4' : r.status === 'withdrawn' ? '#fef2f2' : '#fffbeb',
                color:      r.status === 'accepted' ? '#16a34a' : r.status === 'withdrawn' ? RED : '#d97706',
              }}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions (owner / admin only) */}
      {canModify && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Actions
          </h3>

          {allowedNext.filter(s => s !== 'cancelled').length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {allowedNext.filter(s => s !== 'cancelled').map(nextStatus => (
                <button key={nextStatus} onClick={() => handleStatusChange(nextStatus)} disabled={actionLoading}
                  style={{ padding: '8px 16px', borderRadius: 7, border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13 }}>
                  Mark as {STATUS_LABELS[nextStatus]}
                </button>
              ))}
            </div>
          )}

          {canCancel && (
            <button onClick={handleCancel} disabled={actionLoading}
              style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${RED}`, background: '#fff', color: RED, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
              {actionLoading ? 'Processing…' : 'Cancel request'}
            </button>
          )}

          {!canCancel && allowedNext.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No actions available for this request.</p>
          )}

          {actionError && (
            <p style={{ color: RED, fontSize: 13, marginTop: 10 }}>{actionError}</p>
          )}
        </div>
      )}
    </div>
  );
}
