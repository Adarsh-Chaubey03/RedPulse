import { useState } from 'react';
import { PageHeader, SectionCard, RED, BORDER } from '../components/ui';

// No /api/admin/verification endpoint exists yet.
// UI shell — wire to real API when backend is ready.

interface VerifItem {
  id: number;
  initial: string;
  name: string;
  role: string;
  email: string;
  submitted: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_QUEUE: VerifItem[] = [
  { id: 1, initial: 'D', name: 'Daniel Kim',          role: 'Donor',    email: 'daniel@example.com',  submitted: '1h ago',  status: 'pending'  },
  { id: 2, initial: 'L', name: 'Leila Chen',           role: 'Hospital', email: 'leila@hospital.com',  submitted: '2h ago',  status: 'pending'  },
  { id: 3, initial: 'M', name: 'Marcus Reed',          role: 'Hospital', email: 'marcus@clinic.com',   submitted: '3h ago',  status: 'pending'  },
  { id: 4, initial: 'S', name: 'Sara Patel',           role: 'Donor',    email: 'sara@example.com',    submitted: 'Yesterday', status: 'approved' },
  { id: 5, initial: 'R', name: 'Riverside Blood Bank', role: 'Blood Bank', email: 'rb@bank.com',       submitted: '2 days ago', status: 'rejected' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fffbeb', color: '#d97706' },
  approved: { bg: '#f0fdf4', color: '#16a34a' },
  rejected: { bg: '#fef2f2', color: RED       },
};

export default function AdminVerificationPage() {
  const [items, setItems] = useState<VerifItem[]>(INITIAL_QUEUE);

  const approve = (id: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' } : i));
  const reject  = (id: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'rejected' } : i));

  const pending  = items.filter(i => i.status === 'pending');
  const resolved = items.filter(i => i.status !== 'pending');

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader
        pill="Admin · Verification"
        title="Verification queue"
        subtitle={<>Review and <span style={{ color: RED }}>approve</span> pending submissions.</>}
      />

      {/* Pending */}
      {pending.length > 0 && (
        <SectionCard style={{ marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Pending review</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{pending.length} submission{pending.length !== 1 ? 's' : ''} awaiting approval</p>
            </div>
          </div>
          {pending.map((item, i) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              borderBottom: i < pending.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                {item.initial}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{item.role} · {item.email} · Submitted {item.submitted}</p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE.pending, flexShrink: 0 }}>Pending</span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => approve(item.id)} style={{ padding: '6px 14px', borderRadius: 7, background: '#16a34a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Approve
                </button>
                <button onClick={() => reject(item.id)} style={{ padding: '6px 14px', borderRadius: 7, background: '#fff', color: RED, border: `1px solid ${RED}`, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {pending.length === 0 && (
        <div style={{ padding: '32px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>✓ No pending submissions.</p>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Recently resolved</h3>
          </div>
          {resolved.map((item, i) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              borderBottom: i < resolved.length - 1 ? `1px solid ${BORDER}` : 'none',
              opacity: 0.75,
            }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                {item.initial}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{item.role} · {item.submitted}</p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[item.status] }}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
