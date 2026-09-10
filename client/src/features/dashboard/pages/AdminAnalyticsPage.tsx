import { useEffect, useState, useCallback } from 'react';
import { listBloodRequests } from '../../blood-request/services/bloodRequestApi';
import { PageHeader, StatCard, SectionCard, CardHeader, RED, BORDER } from '../components/ui';
import type { BloodRequest } from '../../blood-request/types';

// Analytics wired to existing blood-requests API.
// Network-wide stats (total users, verifications) are placeholders until
// admin analytics backend endpoint is built.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART  = [38,52,45,68,61,79,55,72,84,66,91,88];
const MAX_C  = Math.max(...CHART);

export default function AdminAnalyticsPage() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBloodRequests({ limit: 100 });
      setRequests(res.data.requests);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]); // load is stable via useCallback

  const total     = requests.length;
  const fulfilled = requests.filter(r => r.status === 'fulfilled').length;
  const active    = requests.filter(r => r.status === 'searching' || r.status === 'partiallyFulfilled').length;
  const critical  = requests.filter(r => r.urgency === 'critical').length;
  const pct       = total ? Math.round((fulfilled / total) * 100) : 0;

  // Blood group breakdown
  const byGroup: Record<string, number> = {};
  requests.forEach(r => { byGroup[r.bloodGroup] = (byGroup[r.bloodGroup] ?? 0) + 1; });
  const groupMax = Math.max(...Object.values(byGroup), 1);

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Admin · Analytics"
        title="Network analytics"
        subtitle={<>Live metrics from the <span style={{ color: RED }}>RedPulse</span> network.</>}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="📋" label="Total requests"   value={loading ? '…' : total}     sub="All time"           iconBg="#fef2f2" iconColor={RED}     />
        <StatCard icon="✅" label="Fulfilment rate"  value={loading ? '…' : `${pct}%`} sub="Of all requests"    iconBg="#f0fdf4" iconColor="#16a34a" />
        <StatCard icon="⚡" label="Active now"       value={loading ? '…' : active}    sub={`${critical} critical`} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard icon="🔴" label="Critical urgency" value={loading ? '…' : critical}  sub="Needs immediate action" iconBg="#fef2f2" iconColor={RED}   />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        {/* Bar chart */}
        <SectionCard>
          <CardHeader title="Monthly request volume" subtitle="Demo data · 12-month trend" />
          <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'flex-end', gap: 6, height: 180 }}>
            {CHART.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: RED, opacity: 0.55 + (v / MAX_C) * 0.45, height: `${(v / MAX_C) * 130}px` }} />
                <span style={{ fontSize: 9, color: '#9ca3af' }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Blood group breakdown (from real data) */}
        <SectionCard>
          <CardHeader title="By blood group" subtitle={loading ? 'Loading…' : `${total} total requests`} />
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading
              ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</p>
              : Object.entries(byGroup).sort((a,b) => b[1]-a[1]).map(([group, count]) => (
                <div key={group}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>{group}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: BORDER, borderRadius: 3 }}>
                    <div style={{ height: 6, background: RED, borderRadius: 3, width: `${(count/groupMax)*100}%`, opacity: 0.7 }} />
                  </div>
                </div>
              ))
            }
            {!loading && Object.keys(byGroup).length === 0 && (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No request data yet.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
