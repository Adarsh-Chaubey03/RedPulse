import { useEffect, useState, useCallback } from 'react';
import { PageHeader, RED, BORDER } from '../components/ui';
import { getMyInventory, updateInventoryEntry } from '../services/inventoryApi';
import type { InventoryEntry } from '../services/inventoryApi';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const getStatus = (units: number): { label: string; bg: string; color: string } => {
  if (units === 0)  return { label: 'Empty',     bg: '#fef2f2', color: RED };
  if (units <= 5)   return { label: 'Critical',  bg: '#fef2f2', color: RED };
  if (units <= 15)  return { label: 'Low stock', bg: '#fffbeb', color: '#d97706' };
  return              { label: 'Healthy',    bg: '#f0fdf4', color: '#16a34a' };
};

export default function InventoryPage() {
  const [inventory,   setInventory]   = useState<InventoryEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState<string | null>(null); // bloodGroup being saved
  const [saveMsg,     setSaveMsg]     = useState('');
  const [editValues,  setEditValues]  = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyInventory();
      const entries = res.data.inventory;
      setInventory(entries);
      // Initialise edit values from current units
      const initial: Record<string, string> = {};
      entries.forEach(e => { initial[e.bloodGroup] = String(e.units); });
      setEditValues(initial);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleSave = async (bloodGroup: string) => {
    const raw = editValues[bloodGroup];
    const units = parseInt(raw, 10);
    if (isNaN(units) || units < 0) {
      setError(`Invalid units for ${bloodGroup} — must be a non-negative integer.`);
      return;
    }
    setSaving(bloodGroup);
    setError('');
    try {
      await updateInventoryEntry(bloodGroup, units);
      setSaveMsg(`${bloodGroup} updated to ${units} units.`);
      setTimeout(() => setSaveMsg(''), 3000);
      await load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update inventory.');
    } finally {
      setSaving(null);
    }
  };

  const totalUnits   = inventory.reduce((s, e) => s + e.units, 0);
  const criticalCount = inventory.filter(e => e.units <= 5).length;

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Blood inventory"
        title="Inventory overview"
        subtitle={<>Manage your blood bank&apos;s stock across <span style={{ color: RED }}>all 8 groups</span>.</>}
        action={
          <button onClick={() => load()}
            style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            ↻ Refresh
          </button>
        }
      />

      {/* Summary strip */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: '⊙', label: 'Total units',    value: totalUnits.toLocaleString(),    sub: 'Across all blood groups',   bg: '#fef2f2', color: RED },
            { icon: '⚠', label: 'Critical/empty', value: criticalCount,                  sub: 'Groups needing attention',  bg: '#fffbeb', color: '#d97706' },
            { icon: '✅', label: 'Healthy groups', value: inventory.filter(e => e.units > 15).length, sub: 'Above low-stock threshold', bg: '#f0fdf4', color: '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 14 }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{s.label}</p>
                <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
          ✓ {saveMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: RED }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          Loading inventory…
        </div>
      )}

      {/* Inventory grid */}
      {!loading && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px 120px', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#f9fafb' }}>
            {['GROUP', 'STOCK BAR', 'UNITS', 'STATUS', 'UPDATE'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>

          {ALL_BLOOD_GROUPS.map((bg, i) => {
            const entry = inventory.find(e => e.bloodGroup === bg);
            const units = entry?.units ?? 0;
            const status = getStatus(units);
            const pct    = Math.min(100, (units / 60) * 100); // 60 units = "full" for bar

            return (
              <div key={bg} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px 120px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < ALL_BLOOD_GROUPS.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}>
                {/* Blood group */}
                <span style={{ fontWeight: 800, fontSize: 15, color: RED }}>{bg}</span>

                {/* Stock bar */}
                <div style={{ paddingRight: 20 }}>
                  <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${pct}%`,
                      background: units === 0 ? '#d1d5db' : units <= 5 ? RED : units <= 15 ? '#d97706' : '#16a34a',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>

                {/* Current units */}
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  {units} <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>units</span>
                </span>

                {/* Status badge */}
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, width: 'fit-content', background: status.bg, color: status.color }}>
                  {status.label}
                </span>

                {/* Inline edit */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    value={editValues[bg] ?? String(units)}
                    onChange={e => setEditValues(v => ({ ...v, [bg]: e.target.value }))}
                    style={{ width: 58, padding: '5px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = RED)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                  />
                  <button
                    onClick={() => handleSave(bg)}
                    disabled={saving === bg}
                    style={{ padding: '5px 10px', borderRadius: 6, background: RED, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: saving === bg ? 'wait' : 'pointer', opacity: saving === bg ? 0.7 : 1 }}
                  >
                    {saving === bg ? '…' : 'Set'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
