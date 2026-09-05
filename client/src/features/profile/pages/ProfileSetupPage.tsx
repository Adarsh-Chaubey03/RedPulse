import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { updateMyProfile } from '../services/profileApi';

// ─── Schema ───────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const profileSetupSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required.')
    .refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid date.' })
    .refine((v) => new Date(v) < new Date(), { message: 'Date of birth cannot be in the future.' }),
  bloodGroup: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Please select a valid blood group.' }) }),
});

type ProfileSetupForm = z.infer<typeof profileSetupSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      dateOfBirth: user?.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : '',
      bloodGroup: (user?.bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? undefined,
    },
  });

  const onSubmit = async (data: ProfileSetupForm) => {
    setServerError('');
    try {
      const response = await updateMyProfile(data);
      setUser(response.data);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to save profile. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '3rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 12 }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Complete your profile</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Role: <strong>{user?.role}</strong>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: '1rem' }}>
        {/* First name */}
        <div>
          <label htmlFor="firstName" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            First name
          </label>
          <input
            id="firstName"
            {...register('firstName')}
            placeholder="First name"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.firstName && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.firstName.message}</p>}
        </div>

        {/* Last name */}
        <div>
          <label htmlFor="lastName" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Last name
          </label>
          <input
            id="lastName"
            {...register('lastName')}
            placeholder="Last name"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.lastName && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.lastName.message}</p>}
        </div>

        {/* Date of birth */}
        <div>
          <label htmlFor="dateOfBirth" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            {...register('dateOfBirth')}
            max={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {errors.dateOfBirth && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.dateOfBirth.message}</p>}
        </div>

        {/* Blood group */}
        <div>
          <label htmlFor="bloodGroup" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Blood group
          </label>
          <select
            id="bloodGroup"
            {...register('bloodGroup')}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          >
            <option value="">Select blood group…</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
          {errors.bloodGroup && <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 4 }}>{errors.bloodGroup.message}</p>}
        </div>

        {/* Profile photo placeholder */}
        <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: 8, fontSize: '0.85rem', color: '#888' }}>
          📷 Profile photo upload — coming soon
        </div>

        {serverError && <p style={{ color: 'crimson' }}>{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '0.75rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
        >
          {isSubmitting ? 'Saving…' : 'Save & continue'}
        </button>
      </form>
    </div>
  );
}
