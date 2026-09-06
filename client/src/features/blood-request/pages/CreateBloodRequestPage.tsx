import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { createBloodRequest } from '../services/bloodRequestApi';
import { useAuthStore } from '../../auth/store/authStore';
import {
  BLOOD_GROUPS,
  BLOOD_COMPONENTS,
  URGENCY_VALUES,
} from '../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  patientName: z.string().trim().min(1, 'Patient name is required.'),
  bloodGroup: z.string().min(1, 'Blood group is required.'),
  bloodComponent: z.string().min(1, 'Blood component is required.'),
  unitsRequired: z
    .number({ invalid_type_error: 'Units must be a number.' })
    .int('Units must be a whole number.')
    .min(1, 'At least 1 unit is required.'),
  hospitalName: z.string().trim().min(1, 'Hospital name is required.'),
  hospitalLatitude: z
    .number({ invalid_type_error: 'Latitude must be a number.' })
    .min(-90, 'Latitude must be between -90 and 90.')
    .max(90, 'Latitude must be between -90 and 90.'),
  hospitalLongitude: z
    .number({ invalid_type_error: 'Longitude must be a number.' })
    .min(-180, 'Longitude must be between -180 and 180.')
    .max(180, 'Longitude must be between -180 and 180.'),
  requiredAt: z
    .string()
    .min(1, 'Required date/time is required.')
    .refine((v) => new Date(v) > new Date(), {
      message: 'Required date/time must be in the future.',
    }),
  urgency: z.string().min(1, 'Urgency is required.'),
  additionalInformation: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URGENCY_LABELS: Record<string, string> = {
  critical: '🔴 Critical',
  urgent:   '🟡 Urgent',
  normal:   '🟢 Normal',
};

// min datetime-local value = now + 15 min
const minDateTime = () => {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  return d.toISOString().slice(0, 16);
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateBloodRequestPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const geo = useGeolocation();
  const [serverError, setServerError] = useState('');
  const [geoFilling, setGeoFilling] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'normal' },
  });

  // Deny donors before rendering the form
  if (user?.role === 'donor') {
    return (
      <div style={{ maxWidth: 560, margin: '3rem auto', padding: '2rem' }}>
        <h2>Create Blood Request</h2>
        <p style={{ color: 'crimson', marginTop: '1rem' }}>
          Donors cannot create blood requests. Only patients and hospitals can submit emergency requests.
        </p>
      </div>
    );
  }

  // When browser location resolves, fill the lat/lng fields
  const handleUseMyLocation = () => {
    setGeoFilling(true);
    geo.requestLocation();
  };

  // Watch geo state changes — once success, populate fields
  if (geo.status === 'success' && geoFilling && geo.latitude !== null && geo.longitude !== null) {
    setValue('hospitalLatitude', parseFloat(geo.latitude.toFixed(6)), { shouldValidate: true });
    setValue('hospitalLongitude', parseFloat(geo.longitude.toFixed(6)), { shouldValidate: true });
    setGeoFilling(false);
    geo.reset();
  }

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    try {
      const response = await createBloodRequest({
        patientName: data.patientName,
        bloodGroup: data.bloodGroup,
        bloodComponent: data.bloodComponent,
        unitsRequired: data.unitsRequired,
        hospitalName: data.hospitalName,
        hospitalLocation: {
          latitude: data.hospitalLatitude,
          longitude: data.hospitalLongitude,
        },
        requiredAt: new Date(data.requiredAt).toISOString(),
        urgency: data.urgency,
        additionalInformation: data.additionalInformation || undefined,
      });
      navigate(`/blood-requests/${response.data._id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: string[] } } };
      setServerError(
        e?.response?.data?.errors?.[0] ||
        e?.response?.data?.message ||
        'Unable to create blood request.',
      );
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: 6,
    border: '1px solid #ccc', fontSize: '0.95rem',
  };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.9rem' };
  const errStyle: React.CSSProperties = { color: 'crimson', fontSize: '0.82rem', marginTop: 3 };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Create Blood Request</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Fields marked * are required.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: '1rem' }}>

        {/* Patient name */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Patient name *</label>
          <input {...register('patientName')} placeholder="Full name of patient" style={inputStyle} />
          {errors.patientName && <p style={errStyle}>{errors.patientName.message}</p>}
        </div>

        {/* Blood group + component side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Blood group *</label>
            <select {...register('bloodGroup')} style={inputStyle}>
              <option value="">Select…</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
            {errors.bloodGroup && <p style={errStyle}>{errors.bloodGroup.message}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Blood component *</label>
            <select {...register('bloodComponent')} style={inputStyle}>
              <option value="">Select…</option>
              {BLOOD_COMPONENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.bloodComponent && <p style={errStyle}>{errors.bloodComponent.message}</p>}
          </div>
        </div>

        {/* Units + urgency side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Units required *</label>
            <input
              type="number"
              min={1}
              step={1}
              {...register('unitsRequired', { valueAsNumber: true })}
              placeholder="e.g. 2"
              style={inputStyle}
            />
            {errors.unitsRequired && <p style={errStyle}>{errors.unitsRequired.message}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Urgency *</label>
            <select {...register('urgency')} style={inputStyle}>
              {URGENCY_VALUES.map((u) => (
                <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
              ))}
            </select>
            {errors.urgency && <p style={errStyle}>{errors.urgency.message}</p>}
          </div>
        </div>

        {/* Hospital name */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Hospital name *</label>
          <input {...register('hospitalName')} placeholder="Name of hospital" style={inputStyle} />
          {errors.hospitalName && <p style={errStyle}>{errors.hospitalName.message}</p>}
        </div>

        {/* Hospital location */}
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
          <p style={{ fontWeight: 500, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            Hospital location *
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Latitude</label>
              <input
                type="number"
                step="any"
                {...register('hospitalLatitude', { valueAsNumber: true })}
                placeholder="-90 to 90"
                style={inputStyle}
              />
              {errors.hospitalLatitude && <p style={errStyle}>{errors.hospitalLatitude.message}</p>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Longitude</label>
              <input
                type="number"
                step="any"
                {...register('hospitalLongitude', { valueAsNumber: true })}
                placeholder="-180 to 180"
                style={inputStyle}
              />
              {errors.hospitalLongitude && <p style={errStyle}>{errors.hospitalLongitude.message}</p>}
            </div>
          </div>

          {/* Use current location shortcut */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geo.status === 'requesting'}
            style={{ padding: '0.35rem 0.9rem', border: '1px solid #c0392b', background: '#fff', color: '#c0392b', borderRadius: 6, cursor: geo.status === 'requesting' ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            {geo.status === 'requesting' ? 'Detecting…' : '📍 Use my current location'}
          </button>
          {geo.errorMessage && <p style={{ ...errStyle, marginTop: 6 }}>{geo.errorMessage}</p>}

          {/* Show filled coords for confirmation */}
          {(watch('hospitalLatitude') || watch('hospitalLongitude')) && (
            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 6 }}>
              {watch('hospitalLatitude')?.toFixed(4)}°, {watch('hospitalLongitude')?.toFixed(4)}°
            </p>
          )}
        </div>

        {/* Required at */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Required by *</label>
          <input
            type="datetime-local"
            min={minDateTime()}
            {...register('requiredAt')}
            style={inputStyle}
          />
          {errors.requiredAt && <p style={errStyle}>{errors.requiredAt.message}</p>}
        </div>

        {/* Additional info */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Additional information</label>
          <textarea
            {...register('additionalInformation')}
            rows={3}
            placeholder="Any additional context (optional)"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {serverError && (
          <p style={{ color: 'crimson', background: '#fff5f5', padding: '0.75rem', borderRadius: 6, fontSize: '0.9rem' }}>
            {serverError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ flex: 1, padding: '0.7rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/blood-requests')}
            style={{ padding: '0.7rem 1.25rem', border: '1px solid #ccc', background: '#fff', borderRadius: 8, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
