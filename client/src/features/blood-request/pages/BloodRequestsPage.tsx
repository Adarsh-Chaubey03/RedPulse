import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listBloodRequests } from '../services/bloodRequestApi';
import { useAuthStore } from '../../auth/store/authStore';
import type { BloodRequest, RequestStatus, Urgency } from '../types';

// ─── Styling helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RequestStatus, { bg: string; color: string }> = {
  searching:          { bg: '#ebf5fb', color: '#2980b9' },
  partiallyFulfilled: { bg: '#fef9e7', color: '#d68910' },
  fulfilled:          { bg: '#eafaf1', color: '#1e8449' },
  expired:            { bg: '#f2f3f4', color: '#717d7e' },
  cancelled:          { bg: '#fdedec', color: '#c0392b' },
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  searching:          'Searching',
  partiallyFulfilled: 'Partially Fulfilled',
  fulfilled:          'Fulfilled',
  expired:            'Expired',
  cancelled:          'Cancelled',
};

const URGENCY_DOT: Record<Urgency, string> = {
  critical: '🔴',
  urgent:   '🟡',
  normal:   '🟢',
};

const formatRelative = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000)    return past ? 'just now' : 'in < 1 min';
  if (abs < 3_600_000) return `${past ? '' : 'in '}${Math.round(abs / 60_000)} min${past ? ' ago' : ''}`;
  if (abs < 86_400_000) return `${past ? '' : 'in '}${Math.round(abs / 3_600_000)} hr${past ? ' ago' : ''}`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BloodRequestsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter]     = useState('');
  const [urgencyFilter, setUrgencyFilter]   = useState('');
  const [bgFilter, setBgFilter]             = useState('');
  const [page, setPage]                     = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status     = statusFilter;
      if (urgencyFilter) params.urgency   = urgencyFilter;
      if (bgFilter)      params.bloodGroup = bgFilter;
      // Non-admin users see only their own requests by default
      if (user && user.role !== 'admin') params.requestedBy = user._id;

      const res = await listBloodRequests(params);
      setRequests(res.data.requests);
      setMeta(res.data.meta);
    } catch {
      setError('Unable to load blood requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, urgencyFilter, bgFilter, user]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(meta.total / meta.limit);

  const selectStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.875rem',
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Blood Requests</h2>
        {user?.role !== 'donor' && (
          <button
            onClick={() => navigate('/blood-requests/new')}
            style={{ padding: '0.5rem 1.25rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            + New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="searching">Searching</option>
          <option value="partiallyFulfilled">Partially Fulfilled</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select value={urgencyFilter} onChange={(e) => { setUrgencyFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All urgencies</option>
          <option value="critical">🔴 Critical</option>
          <option value="urgent">🟡 Urgent</option>
          <option value="normal">🟢 Normal</option>
        </select>

        <select value={bgFilter} onChange={(e) => { setBgFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All blood groups</option>
          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>

        {(statusFilter || urgencyFilter || bgFilter) && (
          <button onClick={() => { setStatusFilter(''); setUrgencyFilter(''); setBgFilter(''); setPage(1); }}
            style={{ padding: '0.4rem 0.8rem', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Loading / error / empty */}
      {loading && <p style={{ color: '#888' }}>Loading…</p>}
      {error   && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && requests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🩸</p>
          <p>No blood requests found.</p>
          {user?.role !== 'donor' && (
            <button onClick={() => navigate('/blood-requests/new')}
              style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Create your first request
            </button>
          )}
        </div>
      )}

      {/* Request cards */}
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        {requests.map((req) => {
          const statusStyle = STATUS_COLORS[req.status] ?? { bg: '#f0f0f0', color: '#333' };
          const isCritical  = req.urgency === 'critical';
          return (
            <Link
              key={req._id}
              to={`/blood-requests/${req._id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                border: isCritical ? '1.5px solid #e74c3c' : '1px solid #e8e8e8',
                borderRadius: 10,
                padding: '1rem 1.25rem',
                background: isCritical ? '#fff9f9' : '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{req.bloodGroup}</span>
                    <span style={{ color: '#888', fontSize: '0.875rem' }}>· {req.bloodComponent}</span>
                    <span style={{ fontSize: '0.875rem' }}>{URGENCY_DOT[req.urgency]} {req.urgency}</span>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.7rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                    background: statusStyle.bg, color: statusStyle.color,
                  }}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>

                {/* Mid row */}
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  {req.patientName}
                </p>
                <p style={{ margin: '0 0 0.25rem', color: '#666', fontSize: '0.85rem' }}>
                  🏥 {req.hospitalName} · {req.unitsRequired} unit{req.unitsRequired !== 1 ? 's' : ''}
                </p>
                <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>
                  Needed: {formatRelative(req.requiredAt)} ·{' '}
                  Created: {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '0.4rem 0.9rem', border: '1px solid #ccc', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff' }}>
            ‹ Prev
          </button>
          <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', color: '#666' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '0.4rem 0.9rem', border: '1px solid #ccc', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: '#fff' }}>
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
