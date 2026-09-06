import { useState } from 'react';
import { PageHeader, ReadyToExplorePlaceholder, DonorsNearbyPanel, RED, BORDER } from '../components/ui';
import { BLOOD_GROUPS } from '../../blood-request/types';

// Hospital "Find donors" page.
// No backend search-donors endpoint exists yet — shows the UI shell with the
// existing map panel. When the API is ready, wire it here.

const sel: React.CSSProperties = {
  padding: '10px 36px 10px 13px', borderRadius: 7, border: `1px solid ${BORDER}`,
  fontSize: 14, color: '#111827', background: '#fff', outline: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', cursor: 'pointer',
};

export default function FindDonorsPage() {
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [radius,     setRadius]     = useState('10');

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Find donors"
        title="Find compatible donors"
        subtitle={<>Search nearby <span style={{ color: RED }}>verified donors</span> by blood group and location.</>}
      />

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, padding: '16px 20px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Blood group</label>
          <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} style={{ ...sel, minWidth: 110 }}>
            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Location</label>
          <input placeholder="Enter hospital address or area" style={{ padding: '10px 13px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
            onFocus={e => (e.currentTarget.style.borderColor = RED)}
            onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Radius</label>
          <select value={radius} onChange={e => setRadius(e.target.value)} style={{ ...sel, minWidth: 100 }}>
            {['5','10','25','50'].map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button style={{ padding: '10px 22px', borderRadius: 7, background: RED, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 42 }}>
            Find donors
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <ReadyToExplorePlaceholder featureName="Donor search" />
        <DonorsNearbyPanel />
      </div>
    </div>
  );
}
