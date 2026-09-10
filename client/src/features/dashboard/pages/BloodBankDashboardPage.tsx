import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';
import { getMyInventory } from '../services/inventoryApi';
import type { InventoryEntry } from '../services/inventoryApi';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const getStatus = (units: number): { label: string; bg: string; color: string } => {
  if (units === 0)  return { label: 'Empty',     bg: '#fef2f2', color: RED };
  if (units <= 5)   return { label: 'Critical',  bg: '#fef2f2', color: RED };
  if (units <= 15)  return { label: 'Low stock', bg: '#fffbeb', color: '#d97706' };
  return              { label: 'Healthy',    bg: '#f0fdf4', color: '#16a34a' };
};

// Camps with valid dates
const CAMPS = [
  { day: '28', month: 'JUN', name: 'Summer wellness drive',  location: 'Downtown Civic Center · 8:00 AM' },
  { day: '02', month: 'JUL', name: 'Community heroes camp',  location: 'Northside Community Hall · 9:00 AM' },
  { day: '06', month: 'JUL', name: 'First responders day',   location: 'City Medical Plaza · 10:00 AM' },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function BloodBankDashboardPage() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [inventory,    setInventory]    = useState<InventoryEntry[]>([]);
  const [invLoading,   setInvLoading]   = useState(true);
  const [invError,     setInvError]     = useState('');

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    setInvError('');
    try {
      const res = await getMyInventory();
      setInventory(res.data.inventory);
    } catch (e: unknown) {
      setInvError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load inventory.',
      );
    } finally {
      setInvLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadInventory(); }, [loadInventory]);

  const orgName       = user?.organizationName ?? user?.firstName ?? 'Blood Bank';
  const totalUnits    = inventory.reduce((s, e) => s + e.units, 0);
  const criticalCount = inventory.filter(e => e.units <= 5).length;

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

      {/* Error banner */}
      {invError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: RED }}>
          {invError}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard
          icon="⊙" label="Total inventory"
          value={invLoading ? '…' : totalUnits.toLocaleString()}
          sub={invLoading ? '' : `Units across ${ALL_BLOOD_GROUPS.length} groups`}
          iconBg="#fef2f2" iconColor={RED}
        />
        <StatCard
          icon="⚠" label="Critical/empty"
          value={invLoading ? '…' : criticalCount}
          sub={invLoading ? '' : criticalCount > 0 ? 'Groups need restocking' : 'All groups stocked'}
          iconBg="#fef2f2" iconColor={RED}
        />
        <StatCard
          icon="≡" label="Blood groups"
          value={ALL_BLOOD_GROUPS.length}
          sub="All types tracked"
          iconBg="#eff6ff" iconColor="#2563eb"
        />
        <StatCard
          icon="📅" label="Upcoming camps"
          value={CAMPS.length}
          sub={`Next: ${CAMPS[0].day} ${CAMPS[0].month}`}
          iconBg="#f0fdf4" iconColor="#16a34a"
        />
      </div>

      {/* ── Two-column grid ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Live inventory overview */}
        <SectionCard>
          <CardHeader
            title="Inventory overview"
            subtitle={invLoading ? 'Loading…' : `${totalUnits} total units · ${criticalCount} critical`}
            actionLabel="Edit inventory"
            actionPath="/inventory"
          />

          {invLoading && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Loading inventory…
            </div>
          )}

          {!invLoading && (
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {ALL_BLOOD_GROUPS.map(bg => {
                const entry  = inventory.find(e => e.bloodGroup === bg);
                const units  = entry?.units ?? 0;
                const status = getStatus(units);
                return (
                  <div key={bg} style={{
                    border: `1px solid ${units <= 15 ? status.color + '55' : BORDER}`,
                    borderRadius: 8, padding: '14px 12px',
                    background: units <= 15 ? status.bg : '#fff',
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: RED }}>{bg}</p>
                    <p style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#111827' }}>{units}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                      units{' '}
                      <span style={{ fontWeight: 600, color: status.color }}>{status.label}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Upcoming camps (static schedule) */}
        <SectionCard>
          <CardHeader
            title="Upcoming camps"
            subtitle="Community donation drives"
            actionLabel="Manage camps"
            actionPath="/donation-camps"
          />
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
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: RED }}>{camp.day}</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5 }}>{camp.month}</p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{camp.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {camp.location}
                </p>
              </div>
              <span style={{ color: '#9ca3af', fontSize: 14, flexShrink: 0 }}>›</span>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}
