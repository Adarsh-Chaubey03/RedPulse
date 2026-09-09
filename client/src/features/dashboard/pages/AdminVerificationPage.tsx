import { useEffect, useState, useCallback } from 'react';
import { PageHeader, SectionCard, RED, BORDER } from '../components/ui';
import {
  getAdminUsers,
  verifyAdminUser,
  rejectAdminUser,
} from '../services/adminApi';
import type { AdminUser } from '../services/adminApi';

// ─── Styles ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fffbeb', color: '#d97706' },
  verified: { bg: '#f0fdf4', color: '#16a34a' },
  rejected: { bg: '#fef2f2', color: RED },
};

const ROLE_LABEL: Record<string, string> = {
  donor: 'Donor', patient: 'Patient', hospital: 'Hospital',
  bloodBank: 'Blood Bank', admin: 'Admin',
};

// ─── Local state type ─────────────────────────────────────────────────────────
interface LocalUser {
  user: AdminUser;
  localStatus: 'pending' | 'verified' | 'rejected';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminVerificationPage() {
  const [items,     setItems]     = useState<LocalUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [acting,    setActing]    = useState<string | null>(null); // userId being acted on

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all non-admin users so we can show both pending and resolved
      const [pendingRes, verifiedRes] = await Promise.all([
        getAdminUsers({ isVerified: false,  limit: 50 }),
        getAdminUsers({ isVerified: true,   limit: 20 }),
      ]);

      const pending  = pendingRes.data.users.map(u => ({ user: u, localStatus: 'pending'  as const }));
      const verified = verifiedRes.data.users.map(u => ({ user: u, localStatus: 'verified' as const }));
      setItems([...pending, ...verified]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load verification data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (userId: string) => {
    setActing(userId);
    setError(null);
    try {
      await verifyAdminUser(userId);
      setItems(prev => prev.map(i => i.user._id === userId ? { ...i, localStatus: 'verified' } : i));
      setActionMsg('User verified successfully.');
      setTimeout(() => setActionMsg(null), 3500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActing(userId);
    setError(null);
    try {
      await rejectAdminUser(userId);
      setItems(prev => prev.map(i => i.user._id === userId ? { ...i, localStatus: 'rejected' } : i));
      setActionMsg('Verification rejected.');
      setTimeout(() => setActionMsg(null), 3500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Rejection failed.');
    } finally {
      setActing(null);
    }
  };

  const pending  = items.filter(i => i.localStatus === 'pending');
  const resolved = items.filter(i => i.localStatus !== 'pending');

  const displayName = (u: AdminUser) =>
    u.organizationName
      ? u.organizationName
      : `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;

  const initial = (u: AdminUser) =>
    (u.organizationName?.[0] ?? u.firstName?.[0] ?? u.email[0]).toUpperCase();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000)  return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader
        pill="Admin · Verification"
        title="Verification queue"
        subtitle={<>Review and <span style={{ color: RED }}>approve</span> pending submissions.</>}
        action={
          <button onClick={() => load()} style={{ padding: '8px 16px', borderRadius: 7, background: '#f3f4f6', border: `1px solid ${BORDER}`, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
            ↻ Refresh
          </button>
        }
      />

      {/* Success */}
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

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading verification queue…</div>
      )}

      {/* Pending */}
      {!loading && pending.length > 0 && (
        <SectionCard style={{ marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Pending review</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{pending.length} submission{pending.length !== 1 ? 's' : ''} awaiting approval</p>
            </div>
          </div>
          {pending.map(({ user: u }, i) => (
            <div key={u._id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              borderBottom: i < pending.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                {initial(u)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{displayName(u)}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
                  {ROLE_LABEL[u.role] ?? u.role} · {u.email} · Registered {formatDate(u.createdAt)}
                  {u.bloodGroup ? ` · ${u.bloodGroup}` : ''}
                </p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE.pending, flexShrink: 0 }}>Pending</span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleApprove(u._id)}
                  disabled={acting === u._id}
                  style={{ padding: '6px 14px', borderRadius: 7, background: '#16a34a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: acting === u._id ? 'wait' : 'pointer', opacity: acting === u._id ? 0.7 : 1 }}>
                  {acting === u._id ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(u._id)}
                  disabled={acting === u._id}
                  style={{ padding: '6px 14px', borderRadius: 7, background: '#fff', color: RED, border: `1px solid ${RED}`, fontSize: 12, fontWeight: 600, cursor: acting === u._id ? 'wait' : 'pointer', opacity: acting === u._id ? 0.7 : 1 }}>
                  {acting === u._id ? '…' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {!loading && pending.length === 0 && (
        <div style={{ padding: '32px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>✓ No pending submissions.</p>
        </div>
      )}

      {/* Recently verified/rejected */}
      {!loading && resolved.length > 0 && (
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Recently resolved</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Last 20 verified users</p>
          </div>
          {resolved.map(({ user: u, localStatus }, i) => (
            <div key={u._id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              borderBottom: i < resolved.length - 1 ? `1px solid ${BORDER}` : 'none',
              opacity: 0.8,
            }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                {initial(u)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{displayName(u)}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{ROLE_LABEL[u.role] ?? u.role} · {u.email}</p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[localStatus] }}>
                {localStatus.charAt(0).toUpperCase() + localStatus.slice(1)}
              </span>
              {/* Allow re-verify / re-reject from resolved section */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {localStatus === 'rejected' && (
                  <button onClick={() => handleApprove(u._id)} disabled={acting === u._id}
                    style={{ padding: '4px 10px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Verify
                  </button>
                )}
                {localStatus === 'verified' && (
                  <button onClick={() => handleReject(u._id)} disabled={acting === u._id}
                    style={{ padding: '4px 10px', borderRadius: 6, background: '#fef2f2', color: RED, border: `1px solid #fecaca`, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
