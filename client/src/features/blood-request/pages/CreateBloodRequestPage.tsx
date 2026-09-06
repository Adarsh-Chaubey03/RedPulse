import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { createBloodRequest } from '../services/bloodRequestApi';
import { useAuthStore } from '../../auth/store/authStore';
import { BLOOD_GROUPS, BLOOD_COMPONENTS } from '../types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RED    = '#c0392b';
const RED_DK = '#a93226';
const BORDER = '#e5e7eb';
const LIGHT  = '#f3f4f6';

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  // Step 1 — Blood need
  bloodGroup:     z.string().min(1, 'Blood group is required.'),
  bloodComponent: z.string().min(1, 'Blood component is required.'),
  unitsRequired:  z.number({ invalid_type_error: 'Enter a number.' }).int().min(1, 'At least 1 unit.'),
  urgency:        z.string().min(1, 'Urgency is required.'),
  additionalInformation: z.string().trim().optional(),
  // Step 2 — Patient
  patientName: z.string().trim().min(1, 'Patient name is required.'),
  requiredAt:  z.string().min(1, 'Required date/time is required.')
    .refine(v => new Date(v) > new Date(), { message: 'Must be in the future.' }),
  // Step 3 — Hospital
  hospitalName:      z.string().trim().min(1, 'Hospital name is required.'),
  hospitalLatitude:  z.number({ invalid_type_error: 'Enter latitude.' }).min(-90).max(90),
  hospitalLongitude: z.number({ invalid_type_error: 'Enter longitude.' }).min(-180).max(180),
});

type FormValues = z.infer<typeof schema>;

// ─── Urgency options ──────────────────────────────────────────────────────────
const URGENCY_OPTIONS = [
  { value: 'critical', label: 'Critical — needed today' },
  { value: 'urgent',   label: 'Urgent — within 24 hours' },
  { value: 'normal',   label: 'Standard' },
] as const;

const UNITS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const minDateTime = () => {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  return d.toISOString().slice(0, 16);
};

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Blood need' },
  { num: 2, label: 'Patient'    },
  { num: 3, label: 'Hospital'   },
  { num: 4, label: 'Review'     },
];

// ─── Shared input style ───────────────────────────────────────────────────────
const sel: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 13px', borderRadius: 7,
  border: `1px solid ${BORDER}`,
  fontSize: 14, color: '#111827', background: '#fff',
  outline: 'none', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
  cursor: 'pointer',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreateBloodRequestPage() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const geo      = useGeolocation();

  const [step,        setStep]        = useState(1);
  const [serverError, setServerError] = useState('');
  const [geoFilling,  setGeoFilling]  = useState(false);

  const { register, handleSubmit, setValue, trigger, getValues,
    formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'critical', unitsRequired: 2, bloodGroup: 'O+', bloodComponent: 'Whole Blood' },
  });

  if (user?.role === 'donor') {
    return (
      <div style={{ maxWidth: 560 }}>
        <p style={{ color: RED }}>Donors cannot create blood requests.</p>
      </div>
    );
  }

  // Geo fill
  if (geo.status === 'success' && geoFilling && geo.latitude !== null && geo.longitude !== null) {
    setValue('hospitalLatitude',  parseFloat(geo.latitude.toFixed(6)),  { shouldValidate: true });
    setValue('hospitalLongitude', parseFloat(geo.longitude.toFixed(6)), { shouldValidate: true });
    setGeoFilling(false);
    geo.reset();
  }

  // Per-step validation fields
  const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
    1: ['bloodGroup', 'bloodComponent', 'unitsRequired', 'urgency'],
    2: ['patientName', 'requiredAt'],
    3: ['hospitalName', 'hospitalLatitude', 'hospitalLongitude'],
  };

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep(s => s + 1);
  };

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    try {
      const res = await createBloodRequest({
        patientName:    data.patientName,
        bloodGroup:     data.bloodGroup,
        bloodComponent: data.bloodComponent,
        unitsRequired:  data.unitsRequired,
        hospitalName:   data.hospitalName,
        hospitalLocation: { latitude: data.hospitalLatitude, longitude: data.hospitalLongitude },
        requiredAt:     new Date(data.requiredAt).toISOString(),
        urgency:        data.urgency,
        additionalInformation: data.additionalInformation || undefined,
      });
      navigate(`/blood-requests/${res.data._id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: string[] } } };
      setServerError(e?.response?.data?.errors?.[0] || e?.response?.data?.message || 'Unable to create blood request.');
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 };
  const errStyle:   React.CSSProperties = { color: RED, fontSize: 12, marginTop: 3 };
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 7,
    border: `1px solid ${BORDER}`, fontSize: 14, color: '#111827', background: '#fff', outline: 'none',
  };

  const vals = getValues();

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <span style={{
        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
        background: '#fef2f2', border: `1px solid #fecaca`,
        color: RED, fontSize: 11, fontWeight: 600, marginBottom: 12,
      }}>
        New emergency request
      </span>
      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
        Create a blood request
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280' }}>
        Tell us what&apos;s needed and we&apos;ll help find compatible donors.
      </p>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step === s.num ? RED : step > s.num ? '#16a34a' : BORDER,
                color: step >= s.num ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                transition: 'background 0.2s',
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: 11, color: step === s.num ? RED : '#9ca3af', whiteSpace: 'nowrap', fontWeight: step === s.num ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: step > s.num ? '#16a34a' : BORDER, margin: '0 8px', marginBottom: 16 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step card */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '28px 28px 24px' }}>

        {/* ── Step 1: Blood need ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: RED }}>01</p>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
              What blood is needed?
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>
              Start with <span style={{ color: RED }}>the essentials</span> so we can match the right donors.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Blood group</label>
                <select {...register('bloodGroup')} style={sel}>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                {errors.bloodGroup && <p style={errStyle}>{errors.bloodGroup.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Blood component</label>
                <select {...register('bloodComponent')} style={sel}>
                  {BLOOD_COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.bloodComponent && <p style={errStyle}>{errors.bloodComponent.message}</p>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Units required</label>
                <select {...register('unitsRequired', { valueAsNumber: true })} style={sel}>
                  {UNITS_OPTIONS.map(n => <option key={n} value={n}>{n} unit{n !== 1 ? 's' : ''}</option>)}
                </select>
                {errors.unitsRequired && <p style={errStyle}>{errors.unitsRequired.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Urgency</label>
                <select {...register('urgency')} style={sel}>
                  {URGENCY_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                {errors.urgency && <p style={errStyle}>{errors.urgency.message}</p>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Additional information</label>
              <textarea {...register('additionalInformation')} rows={3}
                placeholder="Share any helpful context for donors or hospitals…"
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </>
        )}

        {/* ── Step 2: Patient ───────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: RED }}>02</p>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
              Who is the patient?
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>
              We need the <span style={{ color: RED }}>patient details</span> and when blood is needed.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Patient name</label>
              <input {...register('patientName')} placeholder="Full name of patient" style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
              {errors.patientName && <p style={errStyle}>{errors.patientName.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Required by (date & time)</label>
              <input type="datetime-local" {...register('requiredAt')} min={minDateTime()} style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
              {errors.requiredAt && <p style={errStyle}>{errors.requiredAt.message}</p>}
            </div>
          </>
        )}

        {/* ── Step 3: Hospital ──────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: RED }}>03</p>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
              Which hospital?
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>
              Tell us <span style={{ color: RED }}>where</span> so we can find nearby donors.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Hospital name</label>
              <input {...register('hospitalName')} placeholder="e.g. St. Mary's Hospital" style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = RED)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
              {errors.hospitalName && <p style={errStyle}>{errors.hospitalName.message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Latitude</label>
                <input type="number" step="any" {...register('hospitalLatitude', { valueAsNumber: true })}
                  placeholder="-90 to 90" style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
                {errors.hospitalLatitude && <p style={errStyle}>{errors.hospitalLatitude.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Longitude</label>
                <input type="number" step="any" {...register('hospitalLongitude', { valueAsNumber: true })}
                  placeholder="-180 to 180" style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = RED)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                />
                {errors.hospitalLongitude && <p style={errStyle}>{errors.hospitalLongitude.message}</p>}
              </div>
            </div>

            <button type="button"
              onClick={() => { setGeoFilling(true); geo.requestLocation(); }}
              disabled={geo.status === 'requesting'}
              style={{
                padding: '8px 16px', borderRadius: 7,
                border: `1px solid ${RED}`, background: '#fff', color: RED,
                fontSize: 13, cursor: 'pointer',
              }}>
              {geo.status === 'requesting' ? 'Detecting…' : '📍 Use my current location'}
            </button>
            {geo.errorMessage && <p style={errStyle}>{geo.errorMessage}</p>}
          </>
        )}

        {/* ── Step 4: Review ────────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: RED }}>04</p>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
              Review your request
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>
              Confirm the details before <span style={{ color: RED }}>submitting</span>.
            </p>

            <div style={{ background: LIGHT, borderRadius: 8, padding: '16px 20px', display: 'grid', gap: 10 }}>
              {[
                ['Blood group',     vals.bloodGroup],
                ['Component',       vals.bloodComponent],
                ['Units',           `${vals.unitsRequired} unit${vals.unitsRequired !== 1 ? 's' : ''}`],
                ['Urgency',         URGENCY_OPTIONS.find(u => u.value === vals.urgency)?.label ?? vals.urgency],
                ['Patient',         vals.patientName],
                ['Required by',     vals.requiredAt ? new Date(vals.requiredAt).toLocaleString() : '—'],
                ['Hospital',        vals.hospitalName],
                ['Location',        vals.hospitalLatitude ? `${vals.hospitalLatitude?.toFixed(4)}°, ${vals.hospitalLongitude?.toFixed(4)}°` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                  <span style={{ width: 110, color: '#6b7280', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{v}</span>
                </div>
              ))}
            </div>

            {serverError && (
              <p style={{ marginTop: 12, color: RED, fontSize: 13 }}>{serverError}</p>
            )}
          </>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
          <button type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/blood-requests')}
            style={{
              padding: '9px 20px', borderRadius: 7,
              border: `1px solid ${BORDER}`, background: '#fff', color: '#374151',
              fontSize: 13, cursor: 'pointer',
            }}>
            {step > 1 ? '← Back' : 'Cancel'}
          </button>

          {step < 4 ? (
            <button type="button" onClick={goNext} style={{
              padding: '9px 24px', borderRadius: 7,
              background: RED, color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = RED_DK)}
              onMouseLeave={e => (e.currentTarget.style.background = RED)}
            >
              Continue →
            </button>
          ) : (
            <button type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={{
                padding: '9px 24px', borderRadius: 7,
                background: isSubmitting ? '#d9534f' : RED,
                color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}>
              {isSubmitting ? 'Submitting…' : '⚡ Submit request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
