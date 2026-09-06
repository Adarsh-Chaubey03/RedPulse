import { useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore';
import { updateMyProfile, updateMyAvailability, updateMyLocation } from '../services/profileApi';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ─── Schema ───────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required.')
    .refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid date.' })
    .refine((v) => new Date(v) < new Date(), { message: 'Date of birth cannot be in the future.' }),
  bloodGroup: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Please select a valid blood group.' }) }),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const labelFor = (role: string) => {
  const map: Record<string, string> = {
    donor: 'Donor',
    patient: 'Patient',
    hospital: 'Hospital',
    bloodBank: 'Blood Bank',
    admin: 'Administrator',
  };
  return map[role] ?? role;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [serverError, setServerError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');

  const geo = useGeolocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      dateOfBirth: user?.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : '',
      bloodGroup: (user?.bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? undefined,
    },
  });

  const onSave = async (data: EditProfileForm) => {
    setServerError('');
    try {
      const response = await updateMyProfile(data);
      setUser(response.data);
      setIsEditing(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update profile.';
      setServerError(message);
    }
  };

  const handleCancel = () => {
    reset({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      dateOfBirth: user?.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : '',
      bloodGroup: (user?.bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? undefined,
    });
    setServerError('');
    setIsEditing(false);
  };

  const handleAvailabilityToggle = async () => {
    if (!user) return;
    setAvailabilityLoading(true);
    setAvailabilityError('');
    try {
      const response = await updateMyAvailability(!user.isAvailable);
      setUser(response.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update availability.';
      setAvailabilityError(message);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 560, margin: '3rem auto', padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Your Profile</h2>

      {/* ── View mode ─────────────────────────────────────────────────────── */}
      {!isEditing ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <ProfileRow label="Name" value={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'} />
          <ProfileRow label="Email" value={user.email} />
          <ProfileRow label="Role" value={labelFor(user.role)} />
          <ProfileRow label="Blood group" value={user.bloodGroup ?? '—'} />
          <ProfileRow label="Date of birth" value={formatDate(user.dateOfBirth)} />
          <ProfileRow
            label="Verification"
            value={
              <span style={{ color: user.isVerified ? 'green' : '#e67e22', fontWeight: 500 }}>
                {user.isVerified ? '✓ Verified' : 'Not verified'}
              </span>
            }
          />
          <ProfileRow
            label="Profile"
            value={
              <span style={{ color: user.isProfileComplete ? 'green' : '#e67e22', fontWeight: 500 }}>
                {user.isProfileComplete ? '✓ Complete' : 'Incomplete'}
              </span>
            }
          />

          {/* Donor availability */}
          {user.role === 'donor' && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 500 }}>Availability</span>
                <button
                  type="button"
                  onClick={handleAvailabilityToggle}
                  disabled={availabilityLoading}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: 20,
                    border: 'none',
                    cursor: availabilityLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    background: user.isAvailable ? '#27ae60' : '#bdc3c7',
                    color: '#fff',
                  }}
                >
                  {availabilityLoading
                    ? '…'
                    : user.isAvailable
                    ? '✓ Available to donate'
                    : 'Unavailable'}
                </button>
              </div>
              {availabilityError && (
                <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 6 }}>{availabilityError}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem', background: '#2c3e50', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Edit Profile
          </button>
        </div>
      ) : (
        /* ── Edit mode ─────────────────────────────────────────────────────── */
        <form onSubmit={handleSubmit(onSave)} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label htmlFor="firstName" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>First name</label>
            <input id="firstName" {...register('firstName')} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
            {errors.firstName && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.firstName.message}</p>}
          </div>

          <div>
            <label htmlFor="lastName" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Last name</label>
            <input id="lastName" {...register('lastName')} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
            {errors.lastName && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.lastName.message}</p>}
          </div>

          <div>
            <label htmlFor="dateOfBirth" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Date of birth</label>
            <input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
            {errors.dateOfBirth && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.dateOfBirth.message}</p>}
          </div>

          <div>
            <label htmlFor="bloodGroup" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Blood group</label>
            <select id="bloodGroup" {...register('bloodGroup')} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}>
              <option value="">Select…</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
            {errors.bloodGroup && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.bloodGroup.message}</p>}
          </div>

          {serverError && <p style={{ color: 'crimson' }}>{serverError}</p>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ flex: 1, padding: '0.6rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{ flex: 1, padding: '0.6rem', background: '#ecf0f1', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Small display-only row ───────────────────────────────────────────────────

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
      <span style={{ width: 130, color: '#666', flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
