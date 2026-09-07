import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { logoutUser } from '../../auth/services/authApi';
import { RED, BORDER } from './ui';

// ─── Nav item type ────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: string;
}

// ─── Icon path data ───────────────────────────────────────────────────────────
const ICON_PATHS: Record<string, string> = {
  dashboard:    'M3 12l9-9 9 9M5 10v9h5v-5h4v5h5v-9',
  create:       'M12 4v16m8-8H4',
  requests:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  notifications:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  profile:      'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  settings:     'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  inventory:    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  camps:        'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const d = ICON_PATHS[name] ?? '';
  const parts = d.split(' M15 12');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {parts.length > 1 ? (
        <>
          <path d={parts[0]} />
          <path d={'M15 12' + parts[1]} />
        </>
      ) : (
        <path d={d} />
      )}
    </svg>
  );
}

// ─── Role-specific nav configs ────────────────────────────────────────────────
type Role = 'patient' | 'bloodBank' | 'hospital' | 'donor' | 'admin';

const WORKSPACE_LABEL: Record<Role, string> = {
  patient:   'Patient Workspace',
  bloodBank: 'Blood Bank Workspace',
  hospital:  'Hospital Workspace',
  donor:     'Donor Workspace',
  admin:     'Admin Workspace',
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  patient: [
    { label: 'Dashboard',      path: '/dashboard',           icon: 'dashboard'     },
    { label: 'Create request', path: '/blood-requests/new',  icon: 'create'        },
    { label: 'My requests',    path: '/blood-requests',      icon: 'requests'      },
    { label: 'Notifications',  path: '/notifications',       icon: 'notifications' },
    { label: 'Profile',        path: '/profile',             icon: 'profile'       },
    { label: 'Settings',       path: '/settings',            icon: 'settings'      },
  ],
  bloodBank: [
    { label: 'Dashboard',      path: '/dashboard',           icon: 'dashboard'     },
    { label: 'Inventory',      path: '/inventory',           icon: 'inventory'     },
    { label: 'Requests',       path: '/blood-requests',      icon: 'requests'      },
    { label: 'Donation camps', path: '/donation-camps',      icon: 'camps'         },
    { label: 'Notifications',  path: '/notifications',       icon: 'notifications' },
    { label: 'Profile',        path: '/profile',             icon: 'profile'       },
    { label: 'Settings',       path: '/settings',            icon: 'settings'      },
  ],
  hospital: [
    { label: 'Dashboard',       path: '/dashboard',           icon: 'dashboard'     },
    { label: 'Requests',        path: '/blood-requests',      icon: 'requests'      },
    { label: 'Find donors',     path: '/find-donors',         icon: 'profile'       },
    { label: 'Notifications',   path: '/notifications',       icon: 'notifications' },
    { label: 'Hospital profile', path: '/profile',            icon: 'profile'       },
    { label: 'Settings',        path: '/settings',            icon: 'settings'      },
  ],
  donor: [
    { label: 'Dashboard',      path: '/dashboard',           icon: 'dashboard'     },
    { label: 'Notifications',  path: '/notifications',       icon: 'notifications' },
    { label: 'Profile',        path: '/profile',             icon: 'profile'       },
    { label: 'Settings',       path: '/settings',            icon: 'settings'      },
  ],
  admin: [
    { label: 'Dashboard',     path: '/dashboard',             icon: 'dashboard'     },
    { label: 'Users',         path: '/admin/users',           icon: 'profile'       },
    { label: 'Blood requests', path: '/blood-requests',       icon: 'requests'      },
    { label: 'Verification',  path: '/admin/verification',    icon: 'camps'         },
    { label: 'Analytics',     path: '/admin/analytics',       icon: 'inventory'     },
    { label: 'Notifications', path: '/notifications',         icon: 'notifications' },
    { label: 'Profile',       path: '/profile',               icon: 'profile'       },
    { label: 'Settings',      path: '/settings',              icon: 'settings'      },
  ],
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  navItems,
  workspaceLabel,
  notifCount,
}: {
  navItems: NavItem[];
  workspaceLabel: string;
  notifCount: number;
}) {
  const location    = useLocation();
  const navigate    = useNavigate();
  const user        = useAuthStore(s => s.user);
  const logoutStore = useAuthStore(s => s.logout);

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    logoutStore();
    navigate('/');
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/dashboard' && path !== '/notifications' && path !== '/profile' && path !== '/settings'
      && location.pathname.startsWith(path));

  return (
    <aside style={{
      width: 200, minWidth: 200, flexShrink: 0,
      background: '#fff', borderRight: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{
            width: 30, height: 30, borderRadius: 7, background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>RedPulse</span>
        </Link>
      </div>

      {/* Workspace label */}
      <div style={{ padding: '14px 20px 6px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
          {workspaceLabel}
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, marginBottom: 2,
                textDecoration: 'none',
                background: active ? '#fef2f2' : 'transparent',
                color: active ? RED : '#374151',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ flexShrink: 0, color: active ? RED : '#6b7280' }}>
                <NavIcon name={item.icon} />
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.label === 'Notifications' && notifCount > 0 && (
                <span style={{
                  background: RED, color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {notifCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#374151', flexShrink: 0,
          }}>
            {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName ?? ''} {user?.lastName ?? ''}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: RED, textTransform: 'capitalize' }}>
              {user?.role === 'bloodBank' ? 'Blood Bank' : user?.role}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          background: 'none', border: 'none', padding: 0,
          fontSize: 12, color: '#9ca3af', cursor: 'pointer', textAlign: 'left',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = RED)}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

// ─── Top bar ─────────────────────────────────────────────────────────────────
function TopBar({ workspace }: { workspace: string }) {
  const user = useAuthStore(s => s.user);

  const displayName = user?.role === 'bloodBank'
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Blood Bank'
    : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  return (
    <header style={{
      height: 52, borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 8, background: '#fff',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
        <span>RedPulse</span>
        <span>›</span>
        <span style={{ color: '#111827', fontWeight: 500 }}>{workspace}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, position: 'relative' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d={ICON_PATHS.notifications} />
          </svg>
          <span style={{ position: 'absolute', top: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: RED, border: '1.5px solid #fff' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: '#e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#374151',
          }}>
            {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
          </span>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{displayName}</span>
        </div>
      </div>
    </header>
  );
}

// ─── Layout export ────────────────────────────────────────────────────────────
export default function PatientLayout() {
  const user        = useAuthStore(s => s.user);
  const [notifCount] = useState(3);

  const role         = (user?.role ?? 'patient') as Role;
  const validRole    = (role in NAV_BY_ROLE ? role : 'patient') as Role;
  const navItems     = NAV_BY_ROLE[validRole];
  const workspaceLabel = WORKSPACE_LABEL[validRole];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar navItems={navItems} workspaceLabel={workspaceLabel} notifCount={notifCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar workspace={workspaceLabel} />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
