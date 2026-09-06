import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getCurrentUser, loginUser } from '../services/authApi';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED      = '#c0392b';
const RED_DARK = '#a93226';
const DARK_BG  = '#0f1623';
const BORDER   = '#e5e7eb';

// ─── Demo role cards ─────────────────────────────────────────────────────────
// Clicking a role card navigates to register with that role pre-selected,
// or for donors/patients to the relevant post-login destination.
const DEMO_ROLES: {
  role: string;
  name: string;
  iconBg: string;
  iconColor: string;
  letter: string;
  hoverColor: string;
  // where clicking the card takes the user
  action: 'register-donor' | 'register-patient' | 'register-hospital' | 'register-bloodBank' | 'register-admin';
}[] = [
  { role: 'Donor',      name: 'Maya Thompson',       letter: '🩸', iconBg: '#fef2f2', iconColor: RED,       hoverColor: RED,       action: 'register-donor'     },
  { role: 'Patient',    name: 'Jordan Miller',        letter: '👤', iconBg: '#eff6ff', iconColor: '#2563eb', hoverColor: '#2563eb', action: 'register-patient'   },
  { role: 'Hospital',   name: "St. Mary's Hospital",  letter: '🏥', iconBg: '#f0fdf4', iconColor: '#16a34a', hoverColor: '#16a34a', action: 'register-hospital'  },
  { role: 'Blood Bank', name: 'Northstar Blood Bank', letter: '🏦', iconBg: '#fffbeb', iconColor: '#d97706', hoverColor: '#d97706', action: 'register-bloodBank' },
  { role: 'Admin',      name: 'Alex Morgan',          letter: '⚙️', iconBg: '#f3f4f6', iconColor: '#6b7280', hoverColor: '#6b7280', action: 'register-admin'     },
];

const roleMap: Record<string, string> = {
  'register-donor':     'donor',
  'register-patient':   'patient',
  'register-hospital':  'hospital',
  'register-bloodBank': 'bloodBank',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const login    = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  // If user was sent here after registering, show a note
  const justRegistered = (location.state as { registered?: boolean })?.registered;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await loginUser({ email, password });
      const token = res.data.accessToken as string;
      const me   = await getCurrentUser();
      login(me.data, token);
      // ProtectedRoute handles redirect after state update
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRoleCard = (action: string) => {
    const role = roleMap[action];
    if (role) {
      navigate('/register', { state: { preselectedRole: role } });
    }
  };

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 13px',
    borderRadius: 7,
    border: `1px solid ${BORDER}`,
    fontSize: 14, color: '#111827',
    outline: 'none',
    background: '#fff',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── LEFT: dark brand panel ───────────────────────────────────────── */}
      <aside style={{
        width: '40%', minWidth: 280, maxWidth: 420,
        background: DARK_BG,
        display: 'flex', flexDirection: 'column',
        padding: '28px 36px',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: -0.2 }}>RedPulse</span>
        </Link>

        {/* Tagline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 60 }}>
          <span style={{
            display: 'inline-block',
            padding: '3px 12px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12, fontWeight: 500,
            width: 'fit-content', marginBottom: 24,
          }}>
            RedPulse demo
          </span>

          <h2 style={{
            fontSize: 'clamp(26px, 3vw, 40px)',
            fontWeight: 700, color: '#fff',
            lineHeight: 1.12, letterSpacing: -1,
            margin: 0,
          }}>
            Care moves faster when people connect.
          </h2>

          <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)' }}>
            Explore the full{' '}
            <span style={{ color: '#fca5a5' }}>emergency</span> blood donation
            experience with one of our{' '}
            <span style={{ color: '#93c5fd' }}>demo roles</span>.
          </p>
        </div>
      </aside>

      {/* ── RIGHT: form panel ────────────────────────────────────────────── */}
      <main style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Back to home */}
        <div style={{ padding: '20px 44px 0' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6b7280', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = RED)}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
            ← Back to home
          </Link>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 44px 44px', maxWidth: 500 }}>

          {/* Pill */}
          <span style={{
            display: 'inline-block', padding: '3px 13px', borderRadius: 20,
            background: '#fef2f2', border: '1px solid #fecaca',
            color: RED, fontSize: 12, fontWeight: 600,
            width: 'fit-content', marginBottom: 14,
          }}>
            {justRegistered ? 'Account created!' : 'Welcome back'}
          </span>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: -0.6, margin: '0 0 6px' }}>
            Sign in to RedPulse
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Use a demo account <span style={{ color: '#2563eb' }}>below</span> to explore{' '}
            <span style={{ color: '#2563eb' }}>each</span> experience.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                Email address
              </label>
              <input type="email" value={email} placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)} required style={inputBase}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                Password
              </label>
              <input type="password" value={password} placeholder="••••••••••••"
                onChange={e => setPassword(e.target.value)} required style={inputBase}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: RED, margin: 0 }}>{error}</p>}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: 7,
              background: loading ? '#d9534f' : RED, color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', marginTop: 2,
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = RED_DARK; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = RED; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>or explore a demo role</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Role cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ROLES.map(d => (
              <button key={d.role} type="button"
                onClick={() => handleRoleCard(d.action)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 9,
                  border: `1px solid ${BORDER}`, background: '#fff',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = d.hoverColor;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${d.hoverColor}30`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: d.iconBg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>{d.letter}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{d.role}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{d.name}</div>
                  </div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: 13, flexShrink: 0 }}>→</span>
              </button>
            ))}
          </div>

          {/* Register link */}
          <p style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: RED, fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
