import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const displayName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

  return (
    <div style={{ maxWidth: 640, margin: '3rem auto', padding: '2rem' }}>
      <h1>Welcome, {displayName}</h1>

      <div
        style={{
          marginTop: '1.5rem',
          display: 'grid',
          gap: '0.75rem',
          background: '#f9f9f9',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <DashRow label="Email" value={user.email} />
        <DashRow label="Role" value={user.role} />
        {user.bloodGroup && <DashRow label="Blood group" value={user.bloodGroup} />}
        <DashRow
          label="Profile"
          value={
            <span style={{ color: user.isProfileComplete ? 'green' : '#e67e22', fontWeight: 500 }}>
              {user.isProfileComplete ? '✓ Complete' : 'Incomplete'}
            </span>
          }
        />
        <DashRow
          label="Verified"
          value={
            <span style={{ color: user.isVerified ? 'green' : '#e67e22', fontWeight: 500 }}>
              {user.isVerified ? '✓ Yes' : 'No'}
            </span>
          }
        />
        {user.role === 'donor' && (
          <DashRow
            label="Available"
            value={
              <span style={{ color: user.isAvailable ? 'green' : '#999', fontWeight: 500 }}>
                {user.isAvailable ? '✓ Available' : 'Unavailable'}
              </span>
            }
          />
        )}
      </div>
    </div>
  );
}

function DashRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem' }}>
      <span style={{ width: 110, color: '#666', flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
