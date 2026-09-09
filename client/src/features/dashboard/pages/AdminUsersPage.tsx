import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader, SectionCard, RED, BORDER } from '../components/ui';
import {
  getAdminUsers,
  verifyAdminUser,
  rejectAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
} from '../services/adminApi';
import type { AdminUser, ListMeta } from '../services/adminApi';

// ─── Role styles ──────────────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  donor:     { bg: '#fef2f2', color: '#c0392b' },
  patient:   { bg: '#eff6ff', color: '#2563eb' },
  hospital:  { bg: '#f0fdf4', color: '#16a34a' },
  bloodBank: { bg: '#fffbeb', color: '#d97706' },
  admin:     { bg: '#f3f4f6', color: '#374151' },
};
const ROLE_LABEL: Record<string, string> = {
  donor: 'Donor', patient: 'Patient', hospital: 'Hospital',
  bloodBank: 'Blood Bank', admin: 'Admin',
};

type ConfirmAction = {
  type: 'verify' | 'reject' | 'deactivate' | 'reactivate';
  userId: string;
  userName: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [meta,      setMeta]      = useState<ListMeta>({ page: 1, limit: 20, total: 0 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Filters
  const [roleFilter,   setRoleFilter]   = useState('');
  const [verifFilter,  setVerifFilter]  = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);

  // Confirmation dialog
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [acting,  setActing]  = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (roleFilter)  params.role       = roleFilter;
      if (verifFilter) params.isVerified = verifFilter === 'verified';
      if (search)      params.search     = search;

      const res = await getAdminUsers(params);
      setUsers(res.data.users);
      setMeta(res.data.meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, verifFilter, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const handleFilterChange = (setter: (v: string) => void, v: string) => {
    setter(v);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  // Confirmation dialog actions
  const openConfirm = (action: ConfirmAction) => setConfirm(action);
  const closeConfirm = () => { if (!acting) setConfirm(null); };

  const executeAction = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      switch (confirm.type) {
        case 'verify':     await verifyAdminUser(confirm.userId);     break;
        case 'reject':     await rejectAdminUser(confirm.userId);     break;
        case 'deactivate': await deactivateAdminUser(confirm.userId); break;
        case 'reactivate': await reactivateAdminUser(confirm.userId); break;
      }
      const msgs: Record<string, string> = {
        verify:     'User verified successfully.',
        reject:     'Verification rejected.',
        deactivate: 'Account deactivated.',
        reactivate: 'Account reactivated.',
      };
      setActionMsg(msgs[confirm.type]);
      setTimeout(() => setActionMsg(null), 3500);
      setConfirm(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed.');
      setConfirm(null);
    } finally {
      setActing(false);
    }
  };

  const displayName = (u: AdminUser) =>
    u.organizationName
      ? u.organizationName
      : `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—';

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        pill="Admin · Users"
        title="User management"
        subtitle={<>View and manage all <span style={{ color: RED }}>registered users</span> across the network.</>}
      />

      {/* Success message */}
      {actionMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
          ✓ {actionMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: RED }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search name, email, organisation…"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          style={{ flex: '1 1 240px', padding: '8px 12px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none' }}
        />
        <select value={roleFilter} onChange={e => handleFilterChange(setRoleFilter, e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">All roles</option>
          <option value="donor">Donor</option>
          <option value="patient">Patient</option>
          <option value="hospital">Hospital</option>
          <option value="bloodBank">Blood Bank</option>
          <option value="admin">Admin</option>
        </select>
        <select value={verifFilter} onChange={e => handleFilterChange(setVerifFilter, e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">All verification</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <button onClick={() => load()} style={{ padding: '8px 14px', borderRadius: 7, background: '#f3f4f6', border: `1px solid ${BORDER}`, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Count */}
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
        {loading ? 'Loading…' : `${meta.total.toLocaleString()} user${meta.total !== 1 ? 's' : ''} found`}
        {roleFilter ? ` · Role: ${ROLE_LABEL[roleFilter] ?? roleFilter}` : ''}
        {verifFilter ? ` · ${verifFilter === 'verified' ? 'Verified' : 'Unverified'}` : ''}
      </p>

      <SectionCard>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 1.8fr', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#f9fafb' }}>
          {['NAME / EMAIL', 'ROLE', 'VERIFIED', 'PROFILE', 'ACTIONS'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading users…</div>
        )}
        {!loading && users.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No users found.</div>
        )}

        {!loading && users.map((u, i) => {
          const rs = ROLE_STYLE[u.role] ?? ROLE_STYLE.admin;
          const name = displayName(u);
          return (
            <div key={u._id} style={{
              display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 1.8fr',
              padding: '13px 20px', alignItems: 'center',
              borderBottom: i < users.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              {/* Name / email */}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
              </div>

              {/* Role badge */}
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, width: 'fit-content', ...rs }}>
                {ROLE_LABEL[u.role] ?? u.role}
              </span>

              {/* Verified */}
              <span style={{ fontSize: 13, color: u.isVerified ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                {u.isVerified ? '✓ Yes' : '—'}
              </span>

              {/* Profile complete */}
              <span style={{ fontSize: 13, color: u.isProfileComplete ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                {u.isProfileComplete ? '✓' : '—'}
              </span>

              {/* Actions */}
              {u.role !== 'admin' ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!u.isVerified ? (
                    <button onClick={() => openConfirm({ type: 'verify', userId: u._id, userName: name })}
                      style={{ padding: '4px 10px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Verify
                    </button>
                  ) : (
                    <button onClick={() => openConfirm({ type: 'reject', userId: u._id, userName: name })}
                      style={{ padding: '4px 10px', borderRadius: 6, background: '#fef2f2', color: RED, border: `1px solid #fecaca`, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Revoke
                    </button>
                  )}
                  <button onClick={() => openConfirm({ type: 'deactivate', userId: u._id, userName: name })}
                    style={{ padding: '4px 10px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Deactivate
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Admin account</span>
              )}
            </div>
          );
        })}
      </SectionCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${BORDER}`, background: '#fff', cursor: page > 1 ? 'pointer' : 'default', color: page > 1 ? '#374151' : '#d1d5db', fontSize: 13 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${BORDER}`, background: '#fff', cursor: page < totalPages ? 'pointer' : 'default', color: page < totalPages ? '#374151' : '#d1d5db', fontSize: 13 }}>
            Next →
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={closeConfirm}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Confirm action</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
              {confirm.type === 'verify'     && <>Mark <strong>{confirm.userName}</strong> as verified?</>}
              {confirm.type === 'reject'     && <>Revoke verification for <strong>{confirm.userName}</strong>?</>}
              {confirm.type === 'deactivate' && <>Deactivate account for <strong>{confirm.userName}</strong>?</>}
              {confirm.type === 'reactivate' && <>Reactivate account for <strong>{confirm.userName}</strong>?</>}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeConfirm} disabled={acting}
                style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={executeAction} disabled={acting}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: confirm.type === 'verify' || confirm.type === 'reactivate' ? '#16a34a' : RED,
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: acting ? 'wait' : 'pointer' }}>
                {acting ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
