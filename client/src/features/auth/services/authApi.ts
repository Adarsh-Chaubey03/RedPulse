import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// ─── Axios instance ───────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // required so browser sends the httpOnly refresh cookie
});

// ─── Refresh-token loop guard ─────────────────────────────────────────────────
// Tracks whether a refresh is already in-flight and queues concurrent 401s.

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const drainQueue = (token: string) => {
  pendingQueue.forEach((p) => p.resolve(token));
  pendingQueue = [];
};

const flushQueue = (error: unknown) => {
  pendingQueue.forEach((p) => p.reject(error));
  pendingQueue = [];
};

// ─── Request interceptor — attach access token ────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401, attempt refresh, retry once ──────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    const is401 = error.response?.status === 401;
    const isRefreshEndpoint = originalRequest.url?.includes('/api/auth/refresh');
    const alreadyRetried = originalRequest._retried === true;

    // Don't attempt refresh for refresh endpoint itself or if already retried
    if (!is401 || isRefreshEndpoint || alreadyRetried) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request to resume after it
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._retried = true;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    // Mark as in-flight
    isRefreshing = true;
    originalRequest._retried = true;

    try {
      const newToken = await refreshToken();
      useAuthStore.getState().setAccessToken(newToken);

      drainQueue(newToken);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError);
      // Session is dead — clear state and send to login
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Auth API calls ───────────────────────────────────────────────────────────

export const registerUser = async (payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'donor' | 'patient' | 'hospital' | 'bloodBank';
}) => {
  const response = await api.post('/api/auth/register', payload);
  return response.data;
};

export const loginUser = async (payload: { email: string; password: string }) => {
  const response = await api.post('/api/auth/login', payload);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

/**
 * Hit /api/auth/refresh — browser sends the httpOnly cookie automatically.
 * Returns the new access token string.
 */
export const refreshToken = async (): Promise<string> => {
  const response = await api.post('/api/auth/refresh');
  return response.data.data.accessToken as string;
};

export const logoutUser = async () => {
  const response = await api.post('/api/auth/logout');
  return response.data;
};
