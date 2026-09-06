import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export type AuthUser = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  location?: GeoPoint;
  role: 'donor' | 'patient' | 'hospital' | 'bloodBank' | 'admin';
  isProfileComplete: boolean;
  isVerified: boolean;
  isAvailable: boolean;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True once the startup session-restore attempt has settled (success or fail). */
  isInitialized: boolean;

  // ── Actions ──
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string) => void;
  setInitialized: () => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  login: (user, token) =>
    set({ user, accessToken: token, isAuthenticated: true }),

  logout: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),

  setUser: (user) =>
    set({ user, isAuthenticated: !!user }),

  setAccessToken: (token) =>
    set({ accessToken: token }),

  setInitialized: () =>
    set({ isInitialized: true }),
}));
