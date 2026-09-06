import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'success'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unsupported';

export interface GeolocationState {
  status: GeolocationStatus;
  latitude: number | null;
  longitude: number | null;
  /** Human-readable error for display */
  errorMessage: string | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  /** Call this to trigger a one-shot location request */
  requestLocation: () => void;
  reset: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,      // 10 s
  maximumAge: 60_000,   // accept a cached fix up to 1 min old
};

const ERROR_MESSAGES: Record<GeolocationStatus, string> = {
  idle: '',
  requesting: '',
  success: '',
  permission_denied: 'Location permission was denied. Please allow access in your browser settings.',
  position_unavailable: 'Your position could not be determined. Please try again.',
  timeout: 'Location request timed out. Please try again.',
  unsupported: 'Your browser does not support geolocation.',
};

const INITIAL_STATE: GeolocationState = {
  status: 'idle',
  latitude: null,
  longitude: null,
  errorMessage: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * One-shot browser geolocation hook.
 * Does NOT continuously track position — only fetches when requestLocation() is called.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>(INITIAL_STATE);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        status: 'unsupported',
        latitude: null,
        longitude: null,
        errorMessage: ERROR_MESSAGES['unsupported'],
      });
      return;
    }

    setState({ status: 'requesting', latitude: null, longitude: null, errorMessage: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: 'success',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          errorMessage: null,
        });
      },
      (error) => {
        let status: GeolocationStatus;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            status = 'permission_denied';
            break;
          case error.POSITION_UNAVAILABLE:
            status = 'position_unavailable';
            break;
          case error.TIMEOUT:
            status = 'timeout';
            break;
          default:
            status = 'position_unavailable';
        }
        setState({
          status,
          latitude: null,
          longitude: null,
          errorMessage: ERROR_MESSAGES[status],
        });
      },
      GEO_OPTIONS,
    );
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, requestLocation, reset };
}
