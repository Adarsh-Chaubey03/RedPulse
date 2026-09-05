import { api } from '../../auth/services/authApi';
import type { AuthUser } from '../../auth/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Calls ────────────────────────────────────────────────────────────────────

export const getMyProfile = async (): Promise<ApiResponse<AuthUser>> => {
  const response = await api.get('/api/users/me');
  return response.data;
};

export const updateMyProfile = async (
  payload: UpdateProfilePayload,
): Promise<ApiResponse<AuthUser>> => {
  const response = await api.patch('/api/users/me', payload);
  return response.data;
};

export const updateMyAvailability = async (
  isAvailable: boolean,
): Promise<ApiResponse<AuthUser>> => {
  const response = await api.patch('/api/users/me/availability', { isAvailable });
  return response.data;
};
