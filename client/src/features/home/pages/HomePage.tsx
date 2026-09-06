import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import heroImg from '../../../assets/hero.png';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED = '#c0392b';
const RED_DARK = '#a93226';
const DARK_BG = '#1a1f2e';
const LIGHT_BG = '#f3f4f6';
const BORDER = '#e5e7eb';

// ─── Blood groups data ────────────────────────────────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ children, color = RED }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: 20,
      border: `1px solid ${color}`,
      color: color,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: 0.2,
    }}>
      {children}
    </span>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{ color: '#374151', fontSize: 14, fontWeight: 450, textDecoration: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.color = RED)}
      onMouseLeave={e => (e.currentTarget.style.color = '#374151')}>
      {children}
    </Link>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#fff',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 24px',
        height: 60,
        display: 'flex', alignItems: 'center', gap: 32,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#111827', letterSpacing: -0.3 }}>RedPulse</span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 28, marginLeft: 8 }}>
          <NavLink to="#how-it-works">How it works</NavLink>
          <NavLink to="#why-redpulse">Why RedPulse</NavLink>
          <NavLink to="#blood-groups">Blood groups</NavLink>
        </nav>

        {/* Auth actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {isAuthenticated ? (
            <Link to="/dashboard" style={{
              padding: '8px 18px', borderRadius: 8,
              background: RED, color: '#fff',
              fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ color: '#374151', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                Log in
              </Link>
              <Link to="/register" style={{
                padding: '8px 18px', borderRadius: 8,
                background: RED, color: '#fff',
                fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Get started →
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleRequestBlood = () => {
    if (isAuthenticated) {
      navigate('/blood-requests/new');
    } else {
      navigate('/login');
    }
  };

  const handleBecomeDonor = () => {
    navigate('/register');
  };

  return (
    <section style={{
      maxWidth: 1100, margin: '0 auto',
      padding: '72px 24px 64px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 48,
      alignItems: 'center',
    }}>
      {/* Left column */}
      <div>
        <Pill>Emergency care, connected</Pill>

        <h1 style={{
          marginTop: 20,
          fontSize: 'clamp(42px, 5vw, 62px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: '#111827',
        }}>
          Find blood donors when every second matters.
        </h1>

        <p style={{
          marginTop: 20,
          fontSize: 16,
          lineHeight: 1.65,
          color: '#6b7280',
          maxWidth: 400,
        }}>
          RedPulse helps patients and hospitals connect with nearby eligible donors{' '}
          <span style={{ color: RED }}>quickly</span>, clearly, and{' '}
          <span style={{ color: RED }}>compassionately</span>.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={handleRequestBlood}
            style={{
              padding: '12px 24px', borderRadius: 8,
              background: RED, color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = RED_DARK)}
            onMouseLeave={e => (e.currentTarget.style.background = RED)}
          >
            Request blood →
          </button>
          <button
            onClick={handleBecomeDonor}
            style={{
              padding: '12px 24px', borderRadius: 8,
              background: '#fff', color: '#111827',
              border: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#9ca3af')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
          >
            Become a donor →
          </button>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
            <span style={{ color: RED }}>🛡</span> Verified donor network
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
            <span style={{ color: '#f59e0b' }}>⚡</span> Built for urgent moments
          </span>
        </div>
      </div>

      {/* Right column — hero image + floating badge */}
      <div style={{ position: 'relative' }}>
        <img
          src={heroImg}
          alt="Blood donation in a hospital"
          style={{
            width: '100%',
            borderRadius: 16,
            objectFit: 'cover',
            maxHeight: 380,
            display: 'block',
          }}
        />
        {/* Floating live-match badge */}
        <div style={{
          position: 'absolute',
          bottom: 24, right: -16,
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: '10px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 12,
          minWidth: 200,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#22c55e', flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(34,197,94,0.25)',
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Live donor match</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>O+ donor found 2.4 km away</div>
          </div>
          <span style={{ color: '#22c55e', fontSize: 16, marginLeft: 4 }}>✓</span>
        </div>
      </div>
    </section>
  );
}

// ─── Donor Search ─────────────────────────────────────────────────────────────

function DonorSearchSection() {
  const navigate = useNavigate();
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [location, setLocation] = useState('Downtown, Seattle');
  const [radius, setRadius] = useState('10 km');

  const handleFind = () => {
    navigate('/blood-requests/new');
  };

  const selectStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    fontSize: 14,
    color: '#111827',
    background: '#fff',
    appearance: 'none' as const,
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
    cursor: 'pointer',
  };

  return (
    <section id="donor-search" style={{ background: LIGHT_BG, padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Pill color="#6b7280">Start here</Pill>
        <h2 style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
          Find a compatible donor nearby
        </h2>
        <p style={{ marginTop: 6, fontSize: 14, color: '#6b7280' }}>
          Try the experience with demo search data.
        </p>

        <div style={{
          marginTop: 24,
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
        }}>
          {/* Blood group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Blood group</label>
            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} style={{ ...selectStyle, minWidth: 110 }}>
              {BLOOD_GROUPS.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                fontSize: 14,
                color: '#111827',
                background: '#fff',
                outline: 'none',
              }}
            />
          </div>

          {/* Radius */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Radius</label>
            <select value={radius} onChange={e => setRadius(e.target.value)} style={{ ...selectStyle, minWidth: 100 }}>
              {['5 km', '10 km', '25 km', '50 km'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Find button */}
          <button
            onClick={handleFind}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: RED, color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              height: 42, alignSelf: 'flex-end',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = RED_DARK)}
            onMouseLeave={e => (e.currentTarget.style.background = RED)}
          >
            Find donors
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Create a request',
      desc: 'Share the blood group, units, hospital, and timing.',
    },
    {
      num: '02',
      title: 'Find compatible donors',
      desc: 'See eligible, nearby donors matched to the request.',
    },
    {
      num: '03',
      title: 'Connect and coordinate',
      desc: 'Donors respond, hospitals confirm, and care moves forward.',
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Pill color="#6b7280">Simple by design</Pill>
        <h2 style={{ marginTop: 12, fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 800, color: '#111827', letterSpacing: -1, maxWidth: 400 }}>
          From urgent need to real connection.
        </h2>
        <p style={{ marginTop: 12, fontSize: 15, color: '#6b7280', maxWidth: 500 }}>
          Every step is{' '}
          <span style={{ color: RED }}>designed</span> to reduce uncertainty and{' '}
          <span style={{ color: RED }}>help</span> people act with confidence.
        </p>

        {/* Steps */}
        <div style={{
          marginTop: 48,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: `1px solid ${BORDER}`,
          position: 'relative',
        }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{
              padding: '32px 24px 32px 0',
              paddingRight: i < steps.length - 1 ? 40 : 0,
              borderRight: i < steps.length - 1 ? `1px solid ${BORDER}` : 'none',
              marginLeft: i > 0 ? 24 : 0,
              position: 'relative',
            }}>
              {/* Step number */}
              <div style={{ fontSize: 12, fontWeight: 600, color: RED, letterSpacing: 0.5, marginBottom: 12 }}>
                {step.num}
              </div>
              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <span style={{
                  position: 'absolute', right: -14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#d1d5db', fontSize: 18, zIndex: 1,
                }}>›</span>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6b7280' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why RedPulse ─────────────────────────────────────────────────────────────

function WhyRedPulseSection() {
  const cards = [
    {
      icon: '📍',
      title: 'Nearby matching',
      desc: 'Search by distance and availability.',
    },
    {
      icon: '🛡',
      title: 'Verified profiles',
      desc: (
        <>
          Know <span style={{ color: RED }}>who</span> is ready and eligible.
        </>
      ),
    },
    {
      icon: '❤',
      title: 'Human-centered',
      desc: (
        <>
          Calm workflows for <span style={{ color: RED }}>urgent situations</span>.
        </>
      ),
    },
  ];

  return (
    <section id="why-redpulse" style={{ background: LIGHT_BG, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Pill color="#6b7280">Why RedPulse</Pill>
        <h2 style={{ marginTop: 12, fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, color: '#111827', letterSpacing: -1.5, maxWidth: 500 }}>
          Clarity for the moments that matter most.
        </h2>

        <div style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {cards.map(card => (
            <div key={card.title} style={{
              background: '#fff',
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: '28px 24px',
            }}>
              <span style={{ fontSize: 22 }}>{card.icon}</span>
              <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.55 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Blood Groups ─────────────────────────────────────────────────────────────

function BloodGroupsSection() {
  const navigate = useNavigate();

  return (
    <section id="blood-groups" style={{ padding: '80px 24px' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 64, alignItems: 'center',
      }}>
        {/* Left */}
        <div>
          <Pill>Blood compatibility</Pill>
          <h2 style={{ marginTop: 12, fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: '#111827', letterSpacing: -1.5 }}>
            Every blood group has a role.
          </h2>
          <p style={{ marginTop: 12, fontSize: 14, color: '#6b7280', lineHeight: 1.65 }}>
            Explore{' '}
            <span style={{ color: RED }}>supported</span> blood groups and{' '}
            <span style={{ color: RED }}>understand</span> compatibility at a glance.
          </p>
          <button
            onClick={() => navigate('/blood-requests')}
            style={{
              marginTop: 24,
              padding: '10px 20px', borderRadius: 8,
              background: '#fff', color: '#111827',
              border: `1px solid ${BORDER}`,
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#9ca3af')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
          >
            Explore compatibility →
          </button>
        </div>

        {/* Right — blood group grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}>
          {BLOOD_GROUPS.map(bg => (
            <div key={bg} style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '14px 12px',
              cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = RED;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${RED}`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: RED }}>{bg}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Compatible matches</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CTASection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleRequest = () => {
    if (isAuthenticated) navigate('/blood-requests/new');
    else navigate('/login');
  };

  return (
    <section style={{ background: DARK_BG, padding: '72px 24px' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 32,
      }}>
        <div>
          <span style={{
            display: 'inline-block', padding: '3px 12px',
            borderRadius: 20, border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, marginBottom: 16,
          }}>
            When it matters
          </span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, color: '#fff', letterSpacing: -1.5 }}>
            Need blood now?
          </h2>
          <p style={{ marginTop: 10, fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Start a <span style={{ color: '#f87171' }}>request</span> or become part of the network that helps save lives.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleRequest}
            style={{
              padding: '13px 28px', borderRadius: 8,
              background: RED, color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = RED_DARK)}
            onMouseLeave={e => (e.currentTarget.style.background = RED)}
          >
            Request blood →
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '13px 28px', borderRadius: 8,
              background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
          >
            Become a donor →
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${BORDER}`,
      padding: '24px',
      background: '#fff',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6,
            background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>RedPulse</span>
        </Link>

        {/* Copyright */}
        <p style={{ fontSize: 13, color: '#9ca3af' }}>© 2024 RedPulse demo platform</p>

        {/* Footer links */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'About', href: '#why-redpulse' },
            { label: 'Help', href: '#' },
          ].map(link => (
            <a key={link.label} href={link.href} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = RED)}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <HeroSection />
        <DonorSearchSection />
        <HowItWorksSection />
        <WhyRedPulseSection />
        <BloodGroupsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
