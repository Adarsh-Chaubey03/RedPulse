import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { updateMyProfile, updateMyAvailability, updateMyLocation } from '../services/profileApi';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import MapPanel from '../../dashboard/components/MapPanel';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED    = '#c0392b';
const RED_DK = '#a93226';
const BORDER = '#e5e7eb';

// ─── Schema (unchanged from original) ────────────────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const editProfileSchema = z.object({
  firstName:   z.string().trim().min(1, 'First name is required.'),
  lastName:    z.string().trim().min(1, 'Last name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.')
    .refine(v => !isNaN(new Date(v).getTime()), { message: 'Invalid date.' })
    .refine(v => new Date(v) < new Date(), { message: 'Cannot be in the future.' }),
  bloodGroup: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Select a valid blood group.' }) }),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

const labelFor = (role: string) => ({
  donor: 'Donor', patient: 'Patient', hospital: 'Hospital',
  bloodBank: 'Blood Bank', admin: 'Administrator',
}[role] ?? role);

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const navigate          = useNavigate();
  const geo               = useGeolocation();

  const [isEditing,          setIsEditing]          = useState(false);
  const [serverError,        setServerError]        = useState('');
  const [availLoading,       setAvailLoading]       = useState(false);
  const [availError,         setAvailError]         = useState('');
  const [locationSaving,     setLocationSaving]     = useState(false);
  const [locationError,      setLocationError]      = useState('');
  const [locationSuccess,    setLocationSuccess]    = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<EditProfileForm>({
      resolver: zodResolver(editProfileSchema),
      defaultValues: {
        firstName:   user?.firstName ?? '',
        lastName:    user?.lastName  ?? '',
        dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        bloodGroup:  (user?.bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? undefined,
      },
    });

  if (!user) return null;

  // ── Handlers (same logic as original) ─────────────────────────────────────
  const onSave = async (data: EditProfileForm) => {
    setServerError('');
    try {
      const res = await updateMyProfile(data);
      setUser(res.data);
      setIsEditing(false);
    } catch (err: unknown) {
      setServerError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update profile.',
      );
    }
  };

  const handleCancel = () => {
    reset({
      firstName:   user.firstName ?? '',
      lastName:    user.lastName  ?? '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      bloodGroup:  (user.bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? undefined,
    });
    setServerError('');
    setIsEditing(false);
  };

  const handleAvailabilityToggle = async () => {
    setAvailLoading(true); setAvailError('');
    try {
      const res = await updateMyAvailability(!user.isAvailable);
      setUser(res.data);
    } catch (err: unknown) {
      setAvailError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update availability.',
      );
    } finally { setAvailLoading(false); }
  };

  const handleSaveLocation = async () => {
    if (geo.status !== 'success' || geo.latitude === null || geo.longitude === null) return;
    setLocationSaving(true); setLocationError(''); setLocationSuccess('');
    try {
      const res = await updateMyLocation(geo.latitude, geo.longitude);
      setUser(res.data);
      setLocationSuccess('Location saved.');
      geo.reset();
    } catch (err: unknown) {
      setLocationError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to save location.',
      );
    } finally { setLocationSaving(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 13px',
    borderRadius: 7, border: `1px solid ${BORDER}`,
    fontSize: 14, color: '#111827', outline: 'none',
  };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 };
  const err: React.CSSProperties = { color: RED, fontSize: 12, marginTop: 3 };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <span style={{
        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
        background: '#fef2f2', border: `1px solid #fecaca`,
        color: RED, fontSize: 11, fontWeight: 600, marginBottom: 12,
      }}>
        Your profile
      </span>
      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
        Profile and verification
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280' }}>
        Keep your information current so <span style={{ color: RED }}>matches</span> are accurate.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── Left: profile card ──────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '28px' }}>
          {!isEditing ? (
            <>
              {/* Avatar + name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
                <span style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: '#fef2f2', color: RED,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, flexShrink: 0,
                }}>
                  {user.firstName?.[0]?.toUpperCase() ?? 'U'}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    {user.firstName} {user.lastName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{labelFor(user.role)}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {user.isVerified && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: '#f0fdf4', color: '#16a34a',
                    }}>✓ Verified</span>
                  )}
                  {user.isProfileComplete && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: '#eff6ff', color: '#2563eb',
                    }}>Complete</span>
                  )}
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
                {[
                  ['Email',       user.email],
                  ['Blood group', user.bloodGroup ?? '—'],
                  ['Date of birth', formatDate(user.dateOfBirth)],
                  ['Location', user.location
                    ? `${user.location.coordinates[1].toFixed(4)}°, ${user.location.coordinates[0].toFixed(4)}°`
                    : 'Not set'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                    <span style={{ width: 120, color: '#6b7280', flexShrink: 0, fontSize: 13 }}>{k}</span>
                    <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Availability toggle (donor only) */}
              {user.role === 'donor' && (
                <div style={{ padding: '14px 0', borderTop: `1px solid ${BORDER}`, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>Availability</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Visible to hospitals when available</p>
                    </div>
                    <button onClick={handleAvailabilityToggle} disabled={availLoading} style={{
                      padding: '6px 16px', borderRadius: 20, border: 'none',
                      background: user.isAvailable ? '#16a34a' : '#9ca3af',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                      cursor: availLoading ? 'not-allowed' : 'pointer',
                    }}>
                      {availLoading ? '…' : user.isAvailable ? '✓ Available' : 'Unavailable'}
                    </button>
                  </div>
                  {availError && <p style={err}>{availError}</p>}
                </div>
              )}

              {/* Location */}
              <div style={{ padding: '14px 0', borderTop: `1px solid ${BORDER}`, marginBottom: 20 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#111827' }}>Update location</p>
                {(geo.status === 'idle' || geo.status === 'permission_denied' || geo.status === 'position_unavailable' || geo.status === 'timeout' || geo.status === 'unsupported') && (
                  <button onClick={() => geo.requestLocation()} style={{
                    padding: '7px 14px', borderRadius: 7,
                    border: `1px solid ${RED}`, background: '#fff', color: RED,
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    📍 Use current location
                  </button>
                )}
                {geo.status === 'requesting' && <p style={{ fontSize: 12, color: '#9ca3af' }}>Requesting…</p>}
                {geo.status === 'success' && geo.latitude !== null && geo.longitude !== null && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>
                      {geo.latitude.toFixed(4)}°, {geo.longitude.toFixed(4)}°
                    </span>
                    <button onClick={handleSaveLocation} disabled={locationSaving} style={{
                      padding: '5px 12px', borderRadius: 7, border: 'none',
                      background: '#16a34a', color: '#fff', fontSize: 12, cursor: 'pointer',
                    }}>
                      {locationSaving ? 'Saving…' : 'Confirm & save'}
                    </button>
                    <button onClick={geo.reset} style={{
                      padding: '5px 10px', borderRadius: 7,
                      border: `1px solid ${BORDER}`, background: '#fff',
                      fontSize: 12, cursor: 'pointer', color: '#6b7280',
                    }}>Cancel</button>
                  </div>
                )}
                {(geo.errorMessage || locationError) && <p style={err}>{geo.errorMessage || locationError}</p>}
                {locationSuccess && <p style={{ ...err, color: '#16a34a' }}>{locationSuccess}</p>}
              </div>

              {/* Edit button */}
              <button onClick={() => setIsEditing(true)} style={{
                padding: '9px 22px', borderRadius: 7,
                background: '#111827', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Edit profile
              </button>
            </>
          ) : (
            /* ── Edit form (same fields as original) ────────────────────── */
            <form onSubmit={handleSubmit(onSave)} style={{ display: 'grid', gap: 14 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Edit profile</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>First name</label>
                  <input {...register('firstName')} style={inp}
                    onFocus={e => (e.currentTarget.style.borderColor = RED)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                  {errors.firstName && <p style={err}>{errors.firstName.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Last name</label>
                  <input {...register('lastName')} style={inp}
                    onFocus={e => (e.currentTarget.style.borderColor = RED)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                  {errors.lastName && <p style={err}>{errors.lastName.message}</p>}
                </div>
              </div>

              <div>
                <label style={lbl}>Date of birth</label>
                <input type="date" {...register('dateOfBirth')} max={new Date().toISOString().split('T')[0]} style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                {errors.dateOfBirth && <p style={err}>{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <label style={lbl}>Blood group</label>
                <select {...register('bloodGroup')} style={{
                  ...inp, appearance: 'none', cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36,
                }}>
                  <option value="">Select…</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                {errors.bloodGroup && <p style={err}>{errors.bloodGroup.message}</p>}
              </div>

              {serverError && <p style={err}>{serverError}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={isSubmitting} style={{
                  flex: 1, padding: '10px', borderRadius: 7,
                  background: isSubmitting ? '#d9534f' : RED, color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                  onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = RED_DK; }}
                  onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.background = RED; }}
                >
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={handleCancel} style={{
                  flex: 1, padding: '10px', borderRadius: 7,
                  background: '#f3f4f6', border: 'none', fontSize: 13, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Right: donors nearby ─────────────────────────────────────── */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Donors nearby</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>12 compatible donors in range</p>
            </div>
            <span style={{ fontSize: 16 }}>📍</span>
          </div>

          {/* Map placeholder */}
          <MapPanel
            height={200}
            center={user.location
              ? { lat: user.location.coordinates[1], lng: user.location.coordinates[0] }
              : { lat: 20, lng: 0 }}
            zoom={user.location ? 13 : 2}
            centerPoint={user.location
              ? {
                  lat: user.location.coordinates[1],
                  lng: user.location.coordinates[0],
                  label: 'Your location',
                }
              : undefined}
          />

          {/* "Return to dashboard" shortcut */}
          <div style={{ padding: '14px 20px' }}>
            <button onClick={() => navigate('/dashboard')} style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, color: '#374151', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              Return to dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
