/**
 * Shared UI primitives reused across all workspace dashboards.
 * Keep this file pure presentational — no API calls, no routing.
 */
import { useNavigate } from 'react-router-dom';
import MapPanel from './MapPanel';

export const RED    = '#c0392b';
export const BORDER = '#e5e7eb';
export const LIGHT  = '#f9fafb';

// ─── Pill label ───────────────────────────────────────────────────────────────
export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
      background: '#fef2f2', border: `1px solid #fecaca`,
      color: RED, fontSize: 11, fontWeight: 600, marginBottom: 12,
    }}>
      {children}
    </span>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
export function PageHeader({
  pill, title, subtitle, action,
}: {
  pill: string;
  title: string;
  subtitle: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
      <div>
        <Pill>{pill}</Pill>
        <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: '#111827', letterSpacing: -0.8 }}>
          {title}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{subtitle}</p>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({
  icon, label, value, sub, iconBg, iconColor,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 10, padding: '18px 20px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 8,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>
        {icon}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{label}</p>
        <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
export function SectionCard({
  children, style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 10, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section card header ──────────────────────────────────────────────────────
export function CardHeader({
  title, subtitle, actionLabel, actionPath,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionPath?: string;
}) {
  const navigate = useNavigate();
  return (
    <div style={{
      padding: '16px 20px', borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{subtitle}</p>}
      </div>
      {actionLabel && actionPath && (
        <button onClick={() => navigate(actionPath)} style={{
          background: 'none', border: 'none', fontSize: 12,
          color: RED, cursor: 'pointer', fontWeight: 600, padding: 0,
        }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Donors nearby map panel ──────────────────────────────────────────────────
// Props are optional — renders an empty map if no data provided.
export function DonorsNearbyPanel({
  donors,
  centerPoint,
}: {
  donors?: import('./MapPanel').DonorMarker[];
  centerPoint?: { lat: number; lng: number };
} = {}) {
  return (
    <SectionCard>
      <CardHeader title="Donors nearby" subtitle={donors ? `${donors.length} compatible donors in range` : '12 compatible donors in range'} />
      <MapPanel
        height={220}
        center={centerPoint ?? { lat: 20, lng: 0 }}
        zoom={centerPoint ? 12 : 2}
        donorMarkers={donors ?? []}
        centerPoint={centerPoint}
      />
    </SectionCard>
  );
}

// ─── "Ready to explore" placeholder card ─────────────────────────────────────
export function ReadyToExplorePlaceholder({
  featureName,
}: {
  featureName: string;
}) {
  const navigate = useNavigate();
  return (
    <SectionCard style={{ padding: '48px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>✨</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
        {featureName} is ready to explore
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
        This demo workspace includes <span style={{ color: RED }}>realistic blood bank data</span> and{' '}
        <span style={{ color: RED }}>interactive controls</span>. More records will appear here as you take action.
      </p>
      <button onClick={() => navigate('/dashboard')} style={{
        background: 'none', border: 'none', fontSize: 13, color: '#374151',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        Return to dashboard →
      </button>
    </SectionCard>
  );
}
