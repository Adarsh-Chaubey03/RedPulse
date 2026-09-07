import { api } from '../../auth/services/authApi';
import type { NearbyDonorsResponse } from '../types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface NearbyDonorsParams {
  bloodGroup: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

// GET /api/donors/nearby
export const getNearbyDonors = async (
  params: NearbyDonorsParams,
): Promise<ApiResponse<NearbyDonorsResponse>> => {
  const response = await api.get('/api/donors/nearby', { params });
  return response.data;
};

// POST /api/blood-requests/:id/respond  (donor only)
export const respondToBloodRequest = async (
  requestId: string,
  note?: string,
): Promise<ApiResponse<{ requestId: string; newStatus: string; unitsFulfilled: number; unitsRequired: number }>> => {
  const response = await api.post(`/api/blood-requests/${requestId}/respond`, { note });
  return response.data;
};

// GET /api/blood-requests/discover  (donor only)
export const discoverBloodRequests = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ requests: unknown[]; meta: { page: number; limit: number; total: number } }>> => {
  const response = await api.get('/api/blood-requests/discover', { params });
  return response.data;
};

// GET /api/blood-requests/:id/responses  (owner / hospital / admin)
export const getRequestResponses = async (
  requestId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.get(`/api/blood-requests/${requestId}/responses`);
  return response.data;
};
