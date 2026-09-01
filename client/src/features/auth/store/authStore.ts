import { create } from 'zustand';

export type AuthUser = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'donor' | 'patient' | 'hospital' | 'bloodBank' | 'admin';
  isProfileComplete: boolean;
  isVerified: boolean;
  isAvailable: boolean;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
