import { useState } from 'react';
import { PageHeader, SectionCard, RED, BORDER } from '../components/ui';
import { BLOOD_GROUPS } from '../../blood-request/types';
import { getNearbyDonors } from '../../blood-request/services/donorApi';
import type { NearbyDonor } from '../../blood-request/types';
import { useGeolocation } from '../../../hooks/useGeolocation';

// ─── Styles ───────────────────────────────────────────────────────────────────
const sel: React.CSSProperties = {
  padding: '10px 36px 10px 13px', borderRadius: 7,
  border: `1px solid ${BORDER}`, fontSize: 14, color: '#111827',
  background: '#fff', outline: 'none', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  cursor: 'pointer',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function FindDonorsPage() {
  const geo = useGeolocation();

  const [bloodGroup, setBloodGroup] = useState('O+');
  const [radius,     setRadius]     = useState('10');
  const [lat,        setLat]        = useState('');
  const [lng,        setLng]        = useState('');
  const [donors,     setDonors]     = useState<NearbyDonor[]>([]);
  const [meta,       setMeta]       = useState<{ count: number; queryMs: number } | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [searched,   setSearched]   = useState(false);

  // Auto-fill lat/lng from browser geolocation
  const handleUseLocation = () => {
    geo.requestLocation();
  };

  // Once geo resolves, fill the fields
  if (geo.status === 'success' && geo.latitude !== null && geo.longitude !== null) {
    const latStr = geo.latitude.toFixed(6);
    const lngStr = geo.longitude.toFixed(6);
    if (lat !== latStr || lng !== lngStr) {
      setLat(latStr);
      setLng(lngStr);
      geo.reset();
    }
  }

  const handleSearch = async () => {
    setError('');
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Please enter valid coordinates or use your current location.');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await getNearbyDonors({
        bloodGroup,
        latitude:  parsedLat,
        longitude: parsedLng,
        radiusKm:  parseInt(radius, 10),
        limit:     50,
      });
      setDonors(res.data.donors);
      setMeta({ count: res.data.meta.count, queryMs: res.data.meta.queryMs });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Unable to search donors.';
      setError(msg);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        pill="Find donors"
        title="Find compatible donors"
        subtitle={<>Search nearby <span style={{ color: RED }}>verified donors</span> by blood group and location.</>}
      />

      {/* Search controls */}
      <SectionCard style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Blood group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Blood group needed</label>
            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} style={{ ...sel, minWidth: 110 }}>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>

          {/* Latitude */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 130 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Latitude</label>
            <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)}
              placeholder="e.g. 40.7128"
              style={{ padding: '10px 13px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
              onFocus={e => (e.currentTarget.style.borderColor = RED)}
              onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>

          {/* Longitude */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 130 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Longitude</label>
            <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)}
              placeholder="e.g. -74.0060"
              style={{ padding: '10px 13px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
              onFocus={e => (e.currentTarget.style.borderColor = RED)}
              onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>

          {/* Radius */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Radius</label>
            <select value={radius} onChange={e => setRadius(e.target.value)} style={{ ...sel, minWidth: 100 }}>
              {['5','10','25','50','100'].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={handleUseLocation}
              disabled={geo.status === 'requesting'}
              style={{ padding: '10px 14px', borderRadius: 7, border: `1px solid ${BORDER}`, background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', height: 42, whiteSpace: 'nowrap' as const }}
            >
              {geo.status === 'requesting' ? 'Detecting…' : '📍 My location'}
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{ padding: '10px 22px', borderRadius: 7, background: RED, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', height: 42 }}
            >
              {loading ? 'Searching…' : 'Find donors'}
            </button>
          </div>
        </div>

        {/* Geo error */}
        {geo.errorMessage && (
          <p style={{ margin: '0 20px 12px', fontSize: 12, color: RED }}>{geo.errorMessage}</p>
        )}
      </SectionCard>

      {/* Error */}
      {error && (
        <p style={{ color: RED, fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      {/* Results */}
      {searched && !loading && (
        <SectionCard>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                {donors.length > 0 ? `${donors.length} compatible donor${donors.length !== 1 ? 's' : ''} found` : 'No donors found'}
              </h3>
              {meta && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                  Within {radius} km · {bloodGroup} compatible · {meta.queryMs}ms
                </p>
              )}
            </div>
          </div>

          {donors.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#9ca3af' }}>
                No available donors found within {radius} km for blood group {bloodGroup}.
              </p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
                Try increasing the search radius or selecting a different blood group.
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 20px', background: '#f9fafb', borderBottom: `1px solid ${BORDER}` }}>
                {['DONOR', 'BLOOD GROUP', 'DISTANCE', 'AVAILABLE', 'VERIFIED'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>{h}</span>
                ))}
              </div>

              {donors.map((donor, i) => {
                const displayName = [donor.firstName, donor.lastName].filter(Boolean).join(' ') || 'Anonymous Donor';
                const initial = (donor.firstName?.[0] ?? donor.bloodGroup[0]).toUpperCase();
                return (
                  <div key={donor._id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    padding: '14px 20px', alignItems: 'center',
                    borderBottom: i < donors.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}>
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#fef2f2', color: RED,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {initial}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{displayName}</span>
                    </div>
                    {/* Blood group */}
                    <span style={{ fontSize: 14, fontWeight: 700, color: RED }}>{donor.bloodGroup}</span>
                    {/* Distance */}
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      {donor.distanceKm < 1
                        ? `${donor.distanceMetres} m`
                        : `${donor.distanceKm} km`}
                    </span>
                    {/* Available */}
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 600, width: 'fit-content',
                      background: donor.isAvailable ? '#f0fdf4' : '#f3f4f6',
                      color: donor.isAvailable ? '#16a34a' : '#6b7280',
                    }}>
                      {donor.isAvailable ? '✓ Available' : 'Unavailable'}
                    </span>
                    {/* Verified */}
                    <span style={{ fontSize: 13, color: donor.isVerified ? '#16a34a' : '#9ca3af' }}>
                      {donor.isVerified ? '✓ Verified' : '—'}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </SectionCard>
      )}

      {/* Pre-search prompt */}
      {!searched && (
        <div style={{ padding: '40px 20px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>
            Enter a location or use your current position, then click <strong>Find donors</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
