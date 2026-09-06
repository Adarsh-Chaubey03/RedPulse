import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBloodRequests } from '../services/bloodRequestApi';
import { useAuthStore } from '../../auth/store/authStore';
import type { BloodRequest, RequestStatus, Urgency } from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED    = '#c0392b';
const BORDER = '#e5e7eb';

// ─── Label / style maps ───────────────────────────────────────────────────────
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

const URGENCY_STYLE: Record<Urgency, React.CSSProperties> = {
  critical: { background: '#fef2f2', color: RED },
  urgent:   { background: '#fffbeb', color: '#d97706' },
  normal:   { background: '#f0fdf4', color: '#16a34a' },
};

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critical',
  urgent:   'Urgent',
  normal:   'Standard',
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString())
    return `Needed today, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === tomorrow.toDateString())
    return `Tomorrow, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BloodRequestsPage() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);

  const [requests,      setRequests]      = useState<BloodRequest[]>([]);
  const [meta,          setMeta]          = useState({ page: 1, limit: 20, total: 0 });
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [page,          setPage]          = useState(1);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (user.role !== 'admin') params.requestedBy = user._id;
      const res = await listBloodRequests(params);
      setRequests(res.data.requests);
      setMeta(res.data.meta);
    } catch {
      setError('Unable to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, user]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? requests.filter(r =>
        r.hospitalName.toLowerCase().includes(search.toLowerCase()) ||
        r._id.toLowerCase().includes(search.toLowerCase()) ||
        r.patientName.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  const totalPages = Math.ceil(meta.total / meta.limit);

  const selStyle: React.CSSProperties = {
    padding: '8px 32px 8px 12px', borderRadius: 7,
    border: `1px solid ${BORDER}`, fontSize: 13, color: '#374151',
    background: '#fff', outline: 'none', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            background: '#fef2f2', border: `1px solid #fecaca`,
            color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10,
          }}>
            Patient requests
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            Blood requests
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
            Search, filter, and stay ahead of <span style={{ color: RED }}>urgent</span> needs.
          </p>
        </div>
        {user?.role !== 'donor' && (
          <button onClick={() => navigate('/blood-requests/new')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 8,
            background: RED, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}>
            ⚡ Create request →
          </button>
        )}
      </div>

      {/* ── Search + filter ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by request ID or hospital"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 13px 9px 34px', borderRadius: 7,
              border: `1px solid ${BORDER}`, fontSize: 13, color: '#374151',
              outline: 'none', background: '#fff',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = RED)}
            onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
          />
        </div>
        {/* Status filter */}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={selStyle}>
          <option value="">All requests</option>
          <option value="searching">Searching</option>
          <option value="partiallyFulfilled">Partially Fulfilled</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {/* More filters (visual only) */}
        <button style={{
          padding: '8px 14px', borderRadius: 7,
          border: `1px solid ${BORDER}`, background: '#fff',
          fontSize: 13, color: '#374151', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ≡ More filters
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px',
          padding: '10px 20px', borderBottom: `1px solid ${BORDER}`,
          background: '#f9fafb',
        }}>
          {['REQUEST', 'BLOOD GROUP', 'LOCATION', 'URGENCY', 'STATUS', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {loading && <p style={{ padding: '24px 20px', color: '#9ca3af', fontSize: 13 }}>Loading…</p>}
        {error   && <p style={{ padding: '16px 20px', color: RED, fontSize: 13 }}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No requests found.</p>
          </div>
        )}

        {!loading && filtered.map((req, i) => (
          <div key={req._id}
            onClick={() => navigate(`/blood-requests/${req._id}`)}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1.8fr 1.2fr 1.4fr 40px',
              padding: '14px 20px',
              borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
              cursor: 'pointer', alignItems: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Request ID + time */}
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                RP-{req._id.slice(-4).toUpperCase()}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: RED }}>
                {formatDateTime(req.requiredAt)}
              </p>
            </div>
            {/* Blood group */}
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>{req.bloodGroup}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{req.unitsRequired} units</p>
            </div>
            {/* Hospital */}
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#111827' }}>{req.hospitalName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>—</p>
            </div>
            {/* Urgency badge */}
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 600,
              ...URGENCY_STYLE[req.urgency as Urgency],
            }}>
              {URGENCY_LABEL[req.urgency as Urgency] ?? req.urgency}
            </span>
            {/* Status badge */}
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 600,
              ...STATUS_STYLE[req.status],
            }}>
              {STATUS_LABEL[req.status]}
            </span>
            {/* Arrow */}
            <span style={{ color: '#9ca3af', fontSize: 16, textAlign: 'right' }}>→</span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 14px', border: `1px solid ${BORDER}`, borderRadius: 7, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            ‹
          </button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: '#6b7280' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 14px', border: `1px solid ${BORDER}`, borderRadius: 7, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}
