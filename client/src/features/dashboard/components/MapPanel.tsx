/**
 * MapPanel — reusable Google Maps panel.
 *
 * Wraps @vis.gl/react-google-maps.
 * - API key comes from VITE_GOOGLE_MAPS_API_KEY (never hardcoded)
 * - When no API key is set, renders the existing CSS placeholder so the app
 *   never crashes — just shows a "configure maps" notice instead.
 * - Supports donor markers (red pins), request markers (blue pins), and a
 *   center-point marker (green).
 * - Clicking a marker opens a small InfoWindow popup.
 * - Fully responsive — height is configurable via props.
 */

import { useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { RED } from './ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DonorMarker {
  id: string;
  lat: number;
  lng: number;
  bloodGroup: string;
  distanceKm: number;
  isAvailable: boolean;
  isVerified: boolean;
  name?: string;
}

export interface RequestMarker {
  id: string;
  lat: number;
  lng: number;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  status: string;
  hospitalName: string;
}

export interface CenterPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface MapPanelProps {
  height?: number | string;
  center?: { lat: number; lng: number };
  zoom?: number;
  donorMarkers?: DonorMarker[];
  requestMarkers?: RequestMarker[];
  centerPoint?: CenterPoint;
  /** Called when user clicks a donor marker */
  onDonorClick?: (donor: DonorMarker) => void;
  /** Called when user clicks a request marker */
  onRequestClick?: (req: RequestMarker) => void;
}

// ─── Marker pin SVGs ─────────────────────────────────────────────────────────
// Using inline SVG div elements instead of the Pin component for full color
// control without Google Maps dependencies.

function DonorPin({ label }: { label: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50% 50% 50% 0',
      background: RED, border: '2px solid #fff',
      transform: 'rotate(-45deg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      cursor: 'pointer',
    }}>
      <span style={{
        transform: 'rotate(45deg)',
        fontSize: 10, fontWeight: 800, color: '#fff',
        lineHeight: 1,
      }}>{label}</span>
    </div>
  );
}

function RequestPin({ urgency }: { urgency: string }) {
  const bg = urgency === 'critical' ? '#c0392b' : urgency === 'urgent' ? '#d97706' : '#2563eb';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50% 50% 50% 0',
      background: bg, border: '2px solid #fff',
      transform: 'rotate(-45deg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      cursor: 'pointer',
    }}>
      <span style={{
        transform: 'rotate(45deg)',
        fontSize: 12, color: '#fff',
      }}>🩸</span>
    </div>
  );
}

function CenterPin({ label }: { label?: string }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      background: '#16a34a', border: '3px solid #fff',
      boxShadow: '0 0 0 3px rgba(22,163,74,0.3)',
      cursor: 'default',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} title={label ?? 'Your location'} />
  );
}

// ─── Fallback when no API key configured ──────────────────────────────────────
function MapPlaceholder({ height }: { height: number | string }) {
  return (
    <div style={{
      height, background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #e0f2fe 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, position: 'relative', overflow: 'hidden',
    }}>
      {/* Street grid lines */}
      {[30, 60, 90, 120, 150, 180, 210].map(y => (
        <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, background: 'rgba(148,163,184,0.4)' }} />
      ))}
      {[40, 80, 120, 160, 200, 240, 280].map(x => (
        <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: 'rgba(148,163,184,0.4)' }} />
      ))}
      <span style={{ fontSize: 22, zIndex: 1 }}>🗺️</span>
      <p style={{ margin: 0, fontSize: 12, color: '#374151', fontWeight: 600, zIndex: 1 }}>
        Map not configured
      </p>
      <p style={{ margin: 0, fontSize: 11, color: '#6b7280', zIndex: 1, textAlign: 'center', maxWidth: 200 }}>
        Add <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>VITE_GOOGLE_MAPS_API_KEY</code> to .env
      </p>
    </div>
  );
}

// ─── Inner map (rendered inside APIProvider) ──────────────────────────────────
function InnerMap({
  center, zoom, height, donorMarkers, requestMarkers, centerPoint, onDonorClick, onRequestClick,
}: MapPanelProps) {
  const [activeDonor,   setActiveDonor]   = useState<DonorMarker | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestMarker | null>(null);

  const defaultCenter = center ?? centerPoint ?? { lat: 20, lng: 0 };
  const defaultZoom   = zoom ?? (centerPoint ? 13 : 2);

  const handleDonorClick = useCallback((donor: DonorMarker) => {
    setActiveRequest(null);
    setActiveDonor(d => d?.id === donor.id ? null : donor);
    onDonorClick?.(donor);
  }, [onDonorClick]);

  const handleRequestClick = useCallback((req: RequestMarker) => {
    setActiveDonor(null);
    setActiveRequest(r => r?.id === req.id ? null : req);
    onRequestClick?.(req);
  }, [onRequestClick]);

  return (
    <Map
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      mapId="redpulse-map"
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl={true}
      streetViewControl={false}
      fullscreenControl={false}
    >
      {/* Center point (user / hospital location) */}
      {centerPoint && (
        <AdvancedMarker position={{ lat: centerPoint.lat, lng: centerPoint.lng }}>
          <CenterPin label={centerPoint.label} />
        </AdvancedMarker>
      )}

      {/* Donor markers */}
      {(donorMarkers ?? []).map(donor => (
        <AdvancedMarker
          key={donor.id}
          position={{ lat: donor.lat, lng: donor.lng }}
          onClick={() => handleDonorClick(donor)}
        >
          <DonorPin label={donor.bloodGroup} />
        </AdvancedMarker>
      ))}

      {/* Request markers */}
      {(requestMarkers ?? []).map(req => (
        <AdvancedMarker
          key={req.id}
          position={{ lat: req.lat, lng: req.lng }}
          onClick={() => handleRequestClick(req)}
        >
          <RequestPin urgency={req.urgency} />
        </AdvancedMarker>
      ))}

      {/* Donor info window */}
      {activeDonor && (
        <InfoWindow
          position={{ lat: activeDonor.lat, lng: activeDonor.lng }}
          onCloseClick={() => setActiveDonor(null)}
          pixelOffset={[0, -40]}
        >
          <div style={{ minWidth: 160, fontFamily: 'inherit' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111827' }}>
              {activeDonor.name ?? 'Anonymous Donor'}
            </p>
            <p style={{ margin: '0 0 2px', fontSize: 12, color: RED, fontWeight: 700 }}>
              {activeDonor.bloodGroup}
            </p>
            <p style={{ margin: '0 0 2px', fontSize: 12, color: '#6b7280' }}>
              {activeDonor.distanceKm < 1
                ? `${Math.round(activeDonor.distanceKm * 1000)} m away`
                : `${activeDonor.distanceKm} km away`}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {activeDonor.isAvailable && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: 10 }}>
                  ✓ Available
                </span>
              )}
              {activeDonor.isVerified && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 10 }}>
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Request info window */}
      {activeRequest && (
        <InfoWindow
          position={{ lat: activeRequest.lat, lng: activeRequest.lng }}
          onCloseClick={() => setActiveRequest(null)}
          pixelOffset={[0, -40]}
        >
          <div style={{ minWidth: 180, fontFamily: 'inherit' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111827' }}>
              {activeRequest.hospitalName}
            </p>
            <p style={{ margin: '0 0 2px', fontSize: 12, color: RED, fontWeight: 700 }}>
              {activeRequest.bloodGroup} · {activeRequest.unitsRequired} unit{activeRequest.unitsRequired !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                ...(activeRequest.urgency === 'critical'
                  ? { background: '#fef2f2', color: RED }
                  : activeRequest.urgency === 'urgent'
                  ? { background: '#fffbeb', color: '#d97706' }
                  : { background: '#f0fdf4', color: '#16a34a' }),
              }}>
                {activeRequest.urgency.charAt(0).toUpperCase() + activeRequest.urgency.slice(1)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                background: '#eff6ff', color: '#2563eb',
              }}>
                {activeRequest.status}
              </span>
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export default function MapPanel(props: MapPanelProps) {
  const height = props.height ?? 240;

  if (!API_KEY) {
    return <MapPlaceholder height={height} />;
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <InnerMap {...props} height={height} />
    </APIProvider>
  );
}

// ─── Helper: convert NearbyDonor → DonorMarker ───────────────────────────────
// Keeps map-related conversions co-located with the map component.
// eslint-disable-next-line react-refresh/only-export-components
export function nearbyDonorToMarker(donor: {
  _id: string;
  firstName?: string;
  lastName?: string;
  bloodGroup: string;
  distanceKm: number;
  isAvailable: boolean;
  isVerified: boolean;
  location: { coordinates: [number, number] }; // [lng, lat]
}): DonorMarker {
  return {
    id:          donor._id,
    lat:         donor.location.coordinates[1],
    lng:         donor.location.coordinates[0],
    bloodGroup:  donor.bloodGroup,
    distanceKm:  donor.distanceKm,
    isAvailable: donor.isAvailable,
    isVerified:  donor.isVerified,
    name:        [donor.firstName, donor.lastName].filter(Boolean).join(' ') || undefined,
  };
}

// ─── Helper: convert BloodRequest → RequestMarker ────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function bloodRequestToMarker(req: {
  _id: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  status: string;
  hospitalName: string;
  hospitalLocation: { coordinates: [number, number] }; // [lng, lat]
}): RequestMarker {
  return {
    id:            req._id,
    lat:           req.hospitalLocation.coordinates[1],
    lng:           req.hospitalLocation.coordinates[0],
    bloodGroup:    req.bloodGroup,
    unitsRequired: req.unitsRequired,
    urgency:       req.urgency,
    status:        req.status,
    hospitalName:  req.hospitalName,
  };
}
