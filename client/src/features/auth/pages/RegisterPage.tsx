import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { registerUser } from '../services/authApi';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED      = '#c0392b';
const RED_DARK = '#a93226';
const DARK_BG  = '#0f1623';
const BORDER   = '#e5e7eb';

const roleOptions = ['donor', 'patient', 'hospital', 'bloodBank'] as const;
type Role = (typeof roleOptions)[number];

const roleLabels: Record<Role, string> = {
  donor:     'Donor',
  patient:   'Patient',
  hospital:  'Hospital',
  bloodBank: 'Blood Bank',
};

// Left-panel copy changes based on role selected
const roleTaglines: Record<Role, { headline: string; sub: string }> = {
  donor:     { headline: 'Be the reason someone survives.', sub: 'Join as a donor and help patients in urgent need find blood quickly.' },
  patient:   { headline: 'Find the blood you need, fast.', sub: 'Create a request and connect with verified donors near you.' },
  hospital:  { headline: 'Coordinate care with confidence.', sub: 'Manage blood requests and coordinate with donors and patients.' },
  bloodBank: { headline: 'Connect supply with urgent demand.', sub: 'Help hospitals and patients find the blood components they need.' },
};

type RegisterForm = {
  email:           string;
  password:        string;
  confirmPassword: string;
  firstName:       string;
  lastName:        string;
  role:            Role;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-select role if navigated from a role card or "Become a donor" button
  const preselected = (location.state as { preselectedRole?: string })?.preselectedRole;
  const validPreselect = roleOptions.find(r => r === preselected) ?? 'donor';

  const [form, setForm] = useState<RegisterForm>({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '',
    role: validPreselect,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerUser({
        email:     form.email,
        password:  form.password,
        firstName: form.firstName || undefined,
        lastName:  form.lastName  || undefined,
        role:      form.role,
      });
      navigate('/login', { state: { registered: true }, replace: true });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to create account.',
      );
    } finally {
      setLoading(false);
    }
  };

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 13px',
    borderRadius: 7,
    border: `1px solid ${BORDER}`,
    fontSize: 14, color: '#111827',
    outline: 'none', background: '#fff',
    transition: 'border-color 0.15s',
  };

  const tagline = roleTaglines[form.role];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── LEFT: dark brand panel ───────────────────────────────────────── */}
      <aside style={{
        width: '40%', minWidth: 280, maxWidth: 420,
        background: DARK_BG,
        display: 'flex', flexDirection: 'column',
        padding: '28px 36px', flexShrink: 0,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: -0.2 }}>RedPulse</span>
        </Link>

        {/* Dynamic tagline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 60 }}>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500,
            width: 'fit-content', marginBottom: 24,
          }}>
            Join as {roleLabels[form.role]}
          </span>

          <h2 style={{
            fontSize: 'clamp(24px, 2.8vw, 38px)', fontWeight: 700,
            color: '#fff', lineHeight: 1.15, letterSpacing: -1, margin: 0,
          }}>
            {tagline.headline}
          </h2>

          <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)' }}>
            {tagline.sub}
          </p>

          {/* Role selector pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
            {roleOptions.map(r => (
              <button key={r} type="button"
                onClick={() => setForm(f => ({ ...f, role: r }))}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: form.role === r ? `1px solid ${RED}` : '1px solid rgba(255,255,255,0.18)',
                  background: form.role === r ? RED : 'transparent',
                  color: form.role === r ? '#fff' : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {roleLabels[r]}
              </button>
            ))}
          </div>
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
            Create account
          </span>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: -0.6, margin: '0 0 6px' }}>
            Join RedPulse
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Create your account and start{' '}
            {form.role === 'donor'
              ? <><span style={{ color: RED }}>saving lives</span> as a donor.</>
              : form.role === 'patient'
              ? <>making <span style={{ color: RED }}>blood requests</span>.</>
              : <>managing <span style={{ color: RED }}>{roleLabels[form.role]}</span> workflows.</>
            }
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>First name</label>
                <input name="firstName" value={form.firstName} placeholder="Maya"
                  onChange={handleChange} style={inputBase}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Last name</label>
                <input name="lastName" value={form.lastName} placeholder="Thompson"
                  onChange={handleChange} style={inputBase}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Email address</label>
              <input name="email" type="email" value={form.email} placeholder="you@example.com"
                onChange={handleChange} required style={inputBase}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Password</label>
              <input name="password" type="password" value={form.password} placeholder="Min. 8 characters"
                onChange={handleChange} required style={inputBase}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Confirm password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} placeholder="Repeat password"
                onChange={handleChange} required style={inputBase}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            {/* Role — hidden select, driven by left-panel pills */}
            <input type="hidden" name="role" value={form.role} />

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
              {loading ? 'Creating account…' : `Create ${roleLabels[form.role]} account`}
            </button>
          </form>

          {/* Sign in link */}
          <p style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: RED, fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
