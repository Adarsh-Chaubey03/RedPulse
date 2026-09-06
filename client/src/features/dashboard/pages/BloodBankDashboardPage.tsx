import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';

// ─── Static demo data ─────────────────────────────────────────────────────────
const INVENTORY: { group: string; units: number; status: 'Healthy' | 'Low stock' | 'Critical' }[] = [
  { group: 'A+',  units: 42, status: 'Healthy'   },
  { group: 'A-',  units: 8,  status: 'Low stock'  },
  { group: 'B+',  units: 31, status: 'Healthy'    },
  { group: 'B-',  units: 14, status: 'Healthy'    },
  { group: 'AB+', units: 24, status: 'Healthy'    },
  { group: 'AB-', units: 9,  status: 'Healthy'    },
  { group: 'O+',  units: 56, status: 'Healthy'    },
  { group: 'O-',  units: 6,  status: 'Low stock'  },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Healthy:    { bg: '#f0fdf4', color: '#16a34a' },
  'Low stock':{ bg: '#fffbeb', color: '#d97706' },
  Critical:   { bg: '#fef2f2', color: RED       },
};

const CAMPS = [
  { day: '28', month: 'JUN', name: 'Summer wellness drive',   location: 'Downtown Civic Center · 8:00 AM' },
  { day: '32', month: 'JUN', name: 'Community heroes camp',   location: 'Northside Community Hall · 9:00 AM' },
  { day: '36', month: 'JUN', name: 'First responders day',    location: 'Northside Community Hall · 9:00 AM' },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BloodBankDashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const orgName = user?.firstName ?? 'Northstar';
  const totalUnits = INVENTORY.reduce((s, i) => s + i.units, 0);
  const criticalCount = INVENTORY.filter(i => i.status === 'Low stock' || i.status === 'Critical').length;

  return (
    <div style={{ maxWidth: 960 }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            background: '#fef2f2', border: `1px solid #fecaca`,
            color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10,
          }}>
            Blood bank dashboard
          </span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            {greeting()}, {orgName}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Keep your <span style={{ color: RED }}>inventory</span> ready for the next emergency.
          </p>
        </div>
        <button onClick={() => navigate('/inventory')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 8,
          background: RED, color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
        }}>
          ⊙ Manage inventory →
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard icon="⊙" label="Total inventory"  value={totalUnits}    sub={`Units across ${INVENTORY.length} groups`}  iconBg="#fef2f2" iconColor={RED}       />
        <StatCard icon="⚡" label="Critical stock"   value={criticalCount} sub="A- and O- need attention"                   iconBg="#fef2f2" iconColor={RED}       />
        <StatCard icon="≡" label="Requests today"   value={18}            sub="6 awaiting fulfilment"                      iconBg="#eff6ff" iconColor="#2563eb"   />
        <StatCard icon="📅" label="Upcoming camps"  value={4}             sub="Next: Jun 28"                               iconBg="#f0fdf4" iconColor="#16a34a"   />
      </div>

      {/* ── Two-column grid ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Inventory overview */}
        <SectionCard>
          <CardHeader
            title="Inventory overview"
            subtitle="Live demo stock levels"
            actionLabel="View inventory"
            actionPath="/inventory"
          />
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {INVENTORY.map(item => {
              const st = STATUS_STYLE[item.status];
              return (
                <div key={item.group} style={{
                  border: `1px solid ${item.status !== 'Healthy' ? st.color + '55' : BORDER}`,
                  borderRadius: 8, padding: '14px 12px',
                  background: item.status !== 'Healthy' ? st.bg : '#fff',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: RED }}>{item.group}</p>
                  <p style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#111827' }}>{item.units}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                    units{' '}
                    <span style={{ fontWeight: 600, color: st.color }}>{item.status}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Upcoming camps */}
        <SectionCard>
          <CardHeader
            title="Upcoming camps"
            subtitle="Community donation drives"
            actionLabel="Manage camps"
            actionPath="/donation-camps"
          />
          <div>
            {CAMPS.map((camp, i) => (
              <div key={i}
                onClick={() => navigate('/donation-camps')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < CAMPS.length - 1 ? `1px solid ${BORDER}` : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Date badge */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: RED }}>{camp.day}</p>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5 }}>{camp.month}</p>
                </div>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{camp.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {camp.location}
                  </p>
                </div>
                <span style={{ color: '#9ca3af', fontSize: 14, flexShrink: 0 }}>›</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
