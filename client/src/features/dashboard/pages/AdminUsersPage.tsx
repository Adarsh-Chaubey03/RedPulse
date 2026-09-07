import { PageHeader, ReadyToExplorePlaceholder, RED, BORDER, SectionCard } from '../components/ui';

// No GET /api/admin/users endpoint exists yet.
// This page shows the UI shell. Wire to real API when backend is ready.

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  donor:     { bg: '#fef2f2', color: '#c0392b' },
  patient:   { bg: '#eff6ff', color: '#2563eb' },
  hospital:  { bg: '#f0fdf4', color: '#16a34a' },
  bloodBank: { bg: '#fffbeb', color: '#d97706' },
  admin:     { bg: '#f3f4f6', color: '#374151' },
};

const DEMO_USERS = [
  { name: 'Maya Thompson', email: 'maya@example.com', role: 'donor',     verified: true  },
  { name: 'Jordan Miller', email: 'jordan@example.com', role: 'patient',   verified: true  },
  { name: "St. Mary's",   email: 'stmarys@hospital.com', role: 'hospital',  verified: true  },
  { name: 'Northstar BB', email: 'northstar@bb.com',  role: 'bloodBank', verified: false },
  { name: 'Alex Morgan',  email: 'alex@admin.com',    role: 'admin',     verified: true  },
];

export default function AdminUsersPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Admin · Users"
        title="User management"
        subtitle={<>View and manage all <span style={{ color: RED }}>registered users</span> across the network.</>}
      />

      <SectionCard>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#f9fafb' }}>
          {['NAME / EMAIL', 'ROLE', 'VERIFIED', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>
        {DEMO_USERS.map((u, i) => {
          const rs = ROLE_STYLE[u.role] ?? ROLE_STYLE.admin;
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < DEMO_USERS.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{u.email}</p>
              </div>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, width: 'fit-content', ...rs }}>
                {u.role === 'bloodBank' ? 'Blood Bank' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
              </span>
              <span style={{ fontSize: 13, color: u.verified ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                {u.verified ? '✓ Yes' : '—'}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Manage →</span>
            </div>
          );
        })}
      </SectionCard>

      <div style={{ marginTop: 20 }}>
        <ReadyToExplorePlaceholder featureName="User management" />
      </div>
    </div>
  );
}
