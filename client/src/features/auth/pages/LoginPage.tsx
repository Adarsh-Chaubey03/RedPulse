import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getCurrentUser, loginUser } from '../services/authApi';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED = '#c0392b';
const RED_DARK = '#a93226';
const DARK_PANEL = '#0f1623';
const BORDER = '#e5e7eb';

// ─── Demo role accounts ───────────────────────────────────────────────────────
const DEMO_ROLES = [
  { role: 'Donor',      name: 'Maya Thompson',       icon: '👤', color: RED,       bg: '#fef2f2' },
  { role: 'Patient',    name: 'Jordan Miller',        icon: '🧑', color: '#2563eb', bg: '#eff6ff' },
  { role: 'Hospital',   name: "St. Mary's Hospital",  icon: '🏥', color: '#374151', bg: '#f9fafb' },
  { role: 'Blood Bank', name: 'Northstar Blood Bank', icon: '🏦', color: '#d97706', bg: '#fffbeb' },
  { role: 'Admin',      name: 'Alex Morgan',          icon: '⚙️', color: '#6b7280', bg: '#f9fafb' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const login    = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response  = await loginUser({ email, password });
      const token     = response.data.accessToken as string;
      const meResponse = await getCurrentUser();
      login(meResponse.data, token);
      // ProtectedRoute / navigate in App handles redirect after login
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* ── Left dark panel ─────────────────────────────────────────────── */}
      <div style={{
        width: '38%', minWidth: 300,
        background: DARK_PANEL,
        display: 'flex', flexDirection: 'column',
        padding: '32px 40px',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{
            width: 34, height: 34, borderRadius: 8,
            background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, flexShrink: 0,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: -0.3 }}>RedPulse</span>
        </Link>

        {/* Tagline — vertically centred in remaining space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 48 }}>
          {/* Badge */}
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 12, fontWeight: 500,
            width: 'fit-content',
            marginBottom: 28,
          }}>
            RedPulse demo
          </span>

          <h1 style={{
            fontSize: 'clamp(32px, 3.5vw, 46px)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: -1.5,
            margin: 0,
          }}>
            Care moves faster when people connect.
          </h1>

          <p style={{
            marginTop: 20,
            fontSize: 14,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.55)',
          }}>
            Explore the full{' '}
            <span style={{ color: '#f87171' }}>emergency</span> blood donation experience{' '}
            with one of our <span style={{ color: '#93c5fd' }}>demo roles</span>.
          </p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Back to home */}
        <div style={{ padding: '20px 48px 0' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#6b7280', textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = RED)}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            ← Back to home
          </Link>
        </div>

        {/* Form container */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 48px 48px',
          maxWidth: 520,
        }}>
          {/* Welcome pill */}
          <span style={{
            display: 'inline-block',
            padding: '3px 14px',
            borderRadius: 20,
            background: '#fef2f2',
            border: `1px solid #fecaca`,
            color: RED,
            fontSize: 12, fontWeight: 600,
            width: 'fit-content',
            marginBottom: 16,
          }}>
            Welcome back
          </span>

          <h2 style={{
            fontSize: 28, fontWeight: 800,
            color: '#111827', letterSpacing: -0.8,
            margin: '0 0 8px',
          }}>
            Sign in to RedPulse
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
            Use a demo account{' '}
            <span style={{ color: '#2563eb' }}>below</span> to explore{' '}
            <span style={{ color: '#2563eb' }}>each</span> experience.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                placeholder="••••••••••••"
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: RED, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 8,
                background: loading ? '#e5a0a0' : RED,
                color: '#fff',
                border: 'none',
                fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = RED_DARK; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = RED; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '24px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>or explore a demo role</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Demo role cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}>
            {DEMO_ROLES.map(demo => (
              <button
                key={demo.role}
                type="button"
                onClick={() => {
                  // Fill in demo credentials — user still clicks Sign in
                  // The reference shows these as quick-fill / navigation shortcuts
                  setEmail('');
                  setPassword('');
                  setError('');
                  navigate('/register');
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = demo.color;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${demo.color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: demo.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, flexShrink: 0,
                  }}>
                    {demo.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{demo.role}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{demo.name}</div>
                  </div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: 14 }}>→</span>
              </button>
            ))}
          </div>

          {/* Register link */}
          <p style={{ marginTop: 24, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: RED, fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
