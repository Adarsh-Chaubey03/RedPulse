import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { updateMyProfile } from '../services/profileApi';

// ─── Design tokens (matches all other pages) ──────────────────────────────────
const RED    = '#c0392b';
const RED_DK = '#a93226';
const BORDER = '#e5e7eb';
const LIGHT  = '#f9fafb';

// ─── Schema ───────────────────────────────────────────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const profileSetupSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName:  z.string().trim().min(1, 'Last name is required.'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required.')
    .refine(v => !isNaN(new Date(v).getTime()), { message: 'Invalid date.' })
    .refine(v => new Date(v) < new Date(), { message: 'Date of birth cannot be in the future.' }),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid blood group.' }),
  }),
});

const orgSetupSchema = z.object({
  organizationName: z.string().trim().min(1, 'Organization name is required.'),
  phone:            z.string().trim().min(6, 'Phone number is required.'),
  address:          z.string().trim().min(1, 'Address is required.'),
});

type ProfileSetupForm = z.infer<typeof profileSetupSchema>;
type OrgSetupForm     = z.infer<typeof orgSetupSchema>;

// ─── Role label helper ────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  donor:     'Donor',
  patient:   'Patient',
  hospital:  'Hospital',
  bloodBank: 'Blood Bank',
  admin:     'Administrator',
};

const ROLE_DESC: Record<string, string> = {
  donor:     'Set up your donor profile so hospitals can find you when blood is needed.',
  patient:   'Complete your profile to create and track blood requests.',
  hospital:  'Complete your hospital profile to manage blood requests and find donors.',
  bloodBank: 'Set up your blood bank profile to coordinate donations and inventory.',
  admin:     'Complete your administrator profile.',
};

// ─── Shared input/select style ────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 13px', borderRadius: 7,
  border: `1px solid ${BORDER}`,
  fontSize: 14, color: '#111827',
  outline: 'none', background: '#fff',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12,
  fontWeight: 600, color: '#374151', marginBottom: 5,
};

const errStyle: React.CSSProperties = {
  color: RED, fontSize: 12, marginTop: 4,
};

// ─── Step indicators ──────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Personal info' },
  { num: 2, label: 'Blood group'   },
  { num: 3, label: 'Done'          },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const role      = user?.role ?? 'patient';
  const roleLabel = ROLE_LABEL[role] ?? role;
  const roleDesc  = ROLE_DESC[role] ?? 'Complete your profile to get started.';

  const isOrgRole = role === 'hospital' || role === 'bloodBank';

  // ── Personal form (donor / patient / admin) ───────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      firstName:   user?.firstName ?? '',
      lastName:    user?.lastName  ?? '',
      dateOfBirth: user?.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : '',
      bloodGroup: (user?.bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? undefined,
    },
  });

  // ── Org form (hospital / bloodBank) ──────────────────────────────────────
  const {
    register: registerOrg,
    handleSubmit: handleSubmitOrg,
    watch: watchOrg,
    formState: { errors: orgErrors, isSubmitting: orgSubmitting },
  } = useForm<OrgSetupForm>({
    resolver: zodResolver(orgSetupSchema),
    defaultValues: {
      organizationName: user?.organizationName ?? '',
      phone:            user?.phone            ?? '',
      address:          user?.address          ?? '',
    },
  });

  // Personal stepper progress
  const firstName   = watch('firstName');
  const lastName    = watch('lastName');
  const dob         = watch('dateOfBirth');
  const bloodGroup  = watch('bloodGroup');
  const step1Done   = !!firstName && !!lastName && !!dob;
  const step2Done   = !!bloodGroup;
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  // Org stepper progress (org roles: step1=name+phone, step2=address)
  const orgName     = watchOrg('organizationName');
  const orgPhone    = watchOrg('phone');
  const orgAddress  = watchOrg('address');
  const orgStep     = !orgName || !orgPhone ? 1 : !orgAddress ? 2 : 3;

  // Use the right stepper value
  const activeStep = isOrgRole ? orgStep : currentStep;

  // ── Submit handlers ───────────────────────────────────────────────────────
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

  const onSubmitOrg = async (data: OrgSetupForm) => {
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

  // Org step labels
  const ORG_STEPS = [
    { num: 1, label: 'Org info'  },
    { num: 2, label: 'Address'   },
    { num: 3, label: 'Done'      },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: LIGHT,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header style={{
        background: '#fff', borderBottom: `1px solid ${BORDER}`,
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: 12,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6, background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}>🩸</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>RedPulse</span>
        </Link>

        {/* Breadcrumb */}
        <span style={{ color: '#d1d5db', fontSize: 14 }}>›</span>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Profile setup</span>

        {/* Back to home */}
        <Link
          to="/"
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center',
            gap: 5, fontSize: 13, color: '#6b7280', textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = RED)}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          ← Back to home
        </Link>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main style={{
        flex: 1, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <span style={{
              display: 'inline-block', padding: '3px 12px', borderRadius: 20,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: RED, fontSize: 11, fontWeight: 600, marginBottom: 10,
            }}>
              {roleLabel} profile
            </span>
            <h1 style={{
              margin: '0 0 8px', fontSize: 26, fontWeight: 700,
              color: '#111827', letterSpacing: -0.6,
            }}>
              Complete your profile
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{roleDesc}</p>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: currentStep === s.num ? RED : currentStep > s.num ? '#16a34a' : BORDER,
                    color: currentStep >= s.num ? '#fff' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    transition: 'background 0.2s',
                  }}>
                    {currentStep > s.num ? '✓' : s.num}
                  </div>
                  <span style={{
                    fontSize: 11, whiteSpace: 'nowrap',
                    color: currentStep === s.num ? RED : '#9ca3af',
                    fontWeight: currentStep === s.num ? 600 : 400,
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 1.5, margin: '0 8px', marginBottom: 16,
                    background: currentStep > s.num ? '#16a34a' : BORDER,
                    transition: 'background 0.2s',
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Form card */}
          <div style={{
            background: '#fff', border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: '28px',
          }}>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="firstName" style={labelStyle}>First name</label>
                  <input
                    id="firstName"
                    {...register('firstName')}
                    placeholder="Maya"
                    style={inputBase}
                    onFocus={e => (e.currentTarget.style.borderColor = RED)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                  />
                  {errors.firstName && <p style={errStyle}>{errors.firstName.message}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" style={labelStyle}>Last name</label>
                  <input
                    id="lastName"
                    {...register('lastName')}
                    placeholder="Thompson"
                    style={inputBase}
                    onFocus={e => (e.currentTarget.style.borderColor = RED)}
                    onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                  />
                  {errors.lastName && <p style={errStyle}>{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Date of birth */}
              <div>
                <label htmlFor="dateOfBirth" style={labelStyle}>Date of birth</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                  max={new Date().toISOString().split('T')[0]}
                  style={inputBase}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
                {errors.dateOfBirth && <p style={errStyle}>{errors.dateOfBirth.message}</p>}
              </div>

              {/* Blood group */}
              <div>
                <label htmlFor="bloodGroup" style={labelStyle}>Blood group</label>
                <select
                  id="bloodGroup"
                  {...register('bloodGroup')}
                  style={{
                    ...inputBase,
                    appearance: 'none' as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 13px center',
                    paddingRight: 38,
                    cursor: 'pointer',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                >
                  <option value="">Select blood group…</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                {errors.bloodGroup && <p style={errStyle}>{errors.bloodGroup.message}</p>}
              </div>

              {/* Donor-specific availability notice */}
              {role === 'donor' && (
                <div style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  fontSize: 13, color: '#15803d', lineHeight: 1.5,
                }}>
                  ✓ As a donor you can toggle your availability from your dashboard at any time.
                </div>
              )}

              {/* Server error */}
              {serverError && (
                <p style={{ ...errStyle, background: '#fef2f2', padding: '10px 14px', borderRadius: 7, margin: 0 }}>
                  {serverError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '11px', borderRadius: 7,
                  background: isSubmitting ? '#d9534f' : RED,
                  color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s', marginTop: 4,
                }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = RED_DK; }}
                onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.background = RED; }}
              >
                {isSubmitting ? 'Saving…' : 'Save & continue →'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            You can update these details later from your{' '}
            <Link to="/profile" style={{ color: RED, textDecoration: 'none' }}>
              profile page
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
