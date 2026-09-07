import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { updateMyAvailability } from '../../profile/services/profileApi';
import { useState } from 'react';
import { StatCard, SectionCard, CardHeader, DonorsNearbyPanel, RED, BORDER } from '../components/ui';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export default function DonorDashboardPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [availLoading, setAvailLoading] = useState(false);
  const [availError,   setAvailError]   = useState('');

  if (!user) return null;
  const firstName = user.firstName ?? 'Donor';

  const handleAvailability = async () => {
    setAvailLoading(true); setAvailError('');
    try {
      const res = await updateMyAvailability(!user.isAvailable);
      setUser(res.data);
    } catch (err: unknown) {
      setAvailError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to update.');
    } finally { setAvailLoading(false); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
            Donor dashboard
          </span>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
            {greeting()}, {firstName}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Your <span style={{ color: RED }}>availability</span> and donation activity.
          </p>
        </div>

        {/* Availability toggle */}
        <button onClick={handleAvailability} disabled={availLoading} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 8,
          background: user.isAvailable ? '#16a34a' : '#6b7280',
          color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
          cursor: availLoading ? 'not-allowed' : 'pointer', flexShrink: 0,
        }}>
          {availLoading ? '…' : user.isAvailable ? '✓ Available to donate' : 'Mark as available'}
        </button>
      </div>
      {availError && <p style={{ color: RED, fontSize: 13, marginBottom: 16 }}>{availError}</p>}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="❤" label="Donations"          value={4}    sub="Total donations"        iconBg="#fef2f2" iconColor={RED}     />
        <StatCard icon="📍" label="Location"           value={user.location ? '✓ Set' : '—'}    sub={user.location ? 'Visible to hospitals' : 'Not set yet'} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard icon="🛡" label="Verification"       value={user.isVerified ? '✓' : '—'}       sub={user.isVerified ? 'Verified' : 'Not verified'}          iconBg="#f0fdf4" iconColor="#16a34a" />
        <StatCard icon="🩸" label="Blood group"        value={user.bloodGroup ?? '—'}             sub="Your type"                     iconBg="#fef2f2" iconColor={RED}     />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Profile summary */}
        <SectionCard>
          <CardHeader title="Your profile" subtitle="Keep your information up to date" actionLabel="Edit profile" actionPath="/profile" />
          <div style={{ padding: '20px', display: 'grid', gap: 12 }}>
            {[
              ['Name',        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'],
              ['Email',       user.email],
              ['Blood group', user.bloodGroup ?? '—'],
              ['Availability', user.isAvailable ? 'Available' : 'Unavailable'],
              ['Profile',     user.isProfileComplete ? 'Complete' : 'Incomplete'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${BORDER}`, fontSize: 14 }}>
                <span style={{ width: 110, color: '#6b7280', fontSize: 13, flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 500, color: '#111827' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <button onClick={() => navigate('/profile')} style={{
              padding: '9px 20px', borderRadius: 7, background: RED, color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Complete profile →
            </button>
          </div>
        </SectionCard>

        <DonorsNearbyPanel />
      </div>
    </div>
  );
}
