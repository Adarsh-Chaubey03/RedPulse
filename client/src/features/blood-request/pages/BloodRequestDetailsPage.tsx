import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBloodRequest, updateBloodRequestStatus, cancelBloodRequest } from '../services/bloodRequestApi';
import { useAuthStore } from '../../auth/store/authStore';
import type { BloodRequest, RequestStatus } from '../types';
import { ALLOWED_TRANSITIONS } from '../types/transitions';

// ─── Styling helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RequestStatus, { bg: string; color: string }> = {
  searching:          { bg: '#ebf5fb', color: '#2980b9' },
  partiallyFulfilled: { bg: '#fef9e7', color: '#d68910' },
  fulfilled:          { bg: '#eafaf1', color: '#1e8449' },
  expired:            { bg: '#f2f3f4', color: '#717d7e' },
  cancelled:          { bg: '#fdedec', color: '#c0392b' },
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  searching:          'Searching for donors',
  partiallyFulfilled: 'Partially fulfilled',
  fulfilled:          'Fulfilled',
  expired:            'Expired',
  cancelled:          'Cancelled',
};

const URGENCY_LABELS: Record<string, string> = {
  critical: '🔴 Critical',
  urgent:   '🟡 Urgent',
  normal:   '🟢 Normal',
};

// Timeline steps in order
const TIMELINE_STEPS: RequestStatus[] = ['searching', 'partiallyFulfilled', 'fulfilled'];

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
    <span style={{ width: 160, color: '#666', flexShrink: 0, fontSize: '0.875rem' }}>{label}</span>
    <span style={{ fontSize: '0.9rem' }}>{value}</span>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function BloodRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBloodRequest(id)
      .then((res) => setRequest(res.data))
      .catch(() => setError('Blood request not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ padding: '3rem 2rem', color: '#888' }}>Loading…</p>;
  if (error || !request) {
    return (
      <div style={{ maxWidth: 600, margin: '3rem auto', padding: '2rem' }}>
        <p style={{ color: 'crimson' }}>{error || 'Request not found.'}</p>
        <button onClick={() => navigate('/blood-requests')} style={{ marginTop: '1rem', padding: '0.4rem 1rem', cursor: 'pointer' }}>
          ← Back to requests
        </button>
      </div>
    );
  }

  const requestedById =
    typeof request.requestedBy === 'string'
      ? request.requestedBy
      : request.requestedBy._id;

  const isOwner = user?._id === requestedById;
  const isAdmin = user?.role === 'admin';
  const canModify = isOwner || isAdmin;

  const statusColors = STATUS_COLORS[request.status] ?? { bg: '#f0f0f0', color: '#333' };
  const allowedNext  = ALLOWED_TRANSITIONS[request.status] ?? [];
  const canCancel    = canModify && !['fulfilled', 'expired', 'cancelled'].includes(request.status);

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

  const [lng, lat] = request.hospitalLocation.coordinates;

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '1rem 2rem' }}>
      {/* Back */}
      <button onClick={() => navigate('/blood-requests')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '0.875rem', padding: 0, marginBottom: '1rem' }}>
        ← All requests
      </button>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
          {request.bloodGroup} · {request.bloodComponent}
        </h2>
        <span style={{
          padding: '0.25rem 0.8rem', borderRadius: 20, fontWeight: 600, fontSize: '0.8rem',
          background: statusColors.bg, color: statusColors.color,
        }}>
          {STATUS_LABELS[request.status]}
        </span>
        <span style={{ fontSize: '0.875rem', marginLeft: 'auto' }}>
          {URGENCY_LABELS[request.urgency] ?? request.urgency}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <Row label="Patient"         value={request.patientName} />
        <Row label="Blood group"     value={request.bloodGroup} />
        <Row label="Component"       value={request.bloodComponent} />
        <Row label="Units required"  value={request.unitsRequired} />
        <Row label="Hospital"        value={request.hospitalName} />
        <Row label="Hospital coords" value={`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`} />
        <Row label="Required by"     value={new Date(request.requiredAt).toLocaleString()} />
        <Row label="Urgency"         value={URGENCY_LABELS[request.urgency] ?? request.urgency} />
        {request.additionalInformation && (
          <Row label="Notes" value={request.additionalInformation} />
        )}
        <Row label="Created"         value={new Date(request.createdAt).toLocaleString()} />
        <Row label="Last updated"    value={new Date(request.updatedAt).toLocaleString()} />
      </div>

      {/* Status timeline */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontWeight: 500, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Status timeline</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {TIMELINE_STEPS.map((step, idx) => {
            const stepIdx    = TIMELINE_STEPS.indexOf(request.status as RequestStatus);
            const isActive   = step === request.status;
            const isDone     = stepIdx > idx;
            const isCancelled = request.status === 'cancelled' || request.status === 'expired';
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                    background: isCancelled ? '#ddd' : isActive ? '#2980b9' : isDone ? '#27ae60' : '#e0e0e0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: isActive ? '#2980b9' : '#999' }}>
                    {STATUS_LABELS[step]}
                  </p>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div style={{ height: 2, flex: 0.5, background: isDone ? '#27ae60' : '#e0e0e0', marginBottom: 16 }} />
                )}
              </div>
            );
          })}
        </div>
        {(request.status === 'cancelled' || request.status === 'expired') && (
          <p style={{ fontSize: '0.8rem', color: '#e74c3c', marginTop: '0.5rem', textAlign: 'center' }}>
            This request is {request.status}.
          </p>
        )}
      </div>

      {/* Actions (owner / admin only) */}
      {canModify && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <p style={{ fontWeight: 500, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Actions</p>

          {/* Allowed status transitions */}
          {allowedNext.filter((s) => s !== 'cancelled').length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {allowedNext.filter((s) => s !== 'cancelled').map((nextStatus) => (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={actionLoading}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: 6, border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer',
                    background: '#2980b9', color: '#fff', fontWeight: 500, fontSize: '0.875rem',
                  }}
                >
                  Mark as {STATUS_LABELS[nextStatus]}
                </button>
              ))}
            </div>
          )}

          {/* Cancel */}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              style={{
                padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #e74c3c',
                background: '#fff', color: '#e74c3c', cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontWeight: 500, fontSize: '0.875rem',
              }}
            >
              {actionLoading ? 'Processing…' : 'Cancel request'}
            </button>
          )}

          {actionError && (
            <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: '0.5rem' }}>{actionError}</p>
          )}
        </div>
      )}
    </div>
  );
}
