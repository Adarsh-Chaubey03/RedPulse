const RED = '#c0392b';
const BORDER = '#e5e7eb';

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 600 }}>
      <span style={{
        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
        background: '#fef2f2', border: `1px solid #fecaca`,
        color: RED, fontSize: 11, fontWeight: 600, marginBottom: 12,
      }}>
        Account settings
      </span>
      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
        Settings
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280' }}>
        Manage your account preferences.
      </p>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#9ca3af' }}>Settings coming soon.</p>
      </div>
    </div>
  );
}
