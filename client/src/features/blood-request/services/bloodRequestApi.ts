import { api } from '../../auth/services/authApi';
import type {
  BloodRequest,
  CreateBloodRequestPayload,
  ListBloodRequestsResponse,
} from '../types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export const createBloodRequest = async (
  payload: CreateBloodRequestPayload,
): Promise<ApiResponse<BloodRequest>> => {
  const response = await api.post('/api/blood-requests', payload);
  return response.data;
};

// ─── List ─────────────────────────────────────────────────────────────────────

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  bloodGroup?: string;
  urgency?: string;
  requestedBy?: string;
}

export const listBloodRequests = async (
  params: ListParams = {},
): Promise<ApiResponse<ListBloodRequestsResponse>> => {
  const response = await api.get('/api/blood-requests', { params });
  return response.data;
};

// ─── Get one ──────────────────────────────────────────────────────────────────

export const getBloodRequest = async (
  id: string,
): Promise<ApiResponse<BloodRequest>> => {
  const response = await api.get(`/api/blood-requests/${id}`);
  return response.data;
};

// ─── Update status ────────────────────────────────────────────────────────────

export const updateBloodRequestStatus = async (
  id: string,
  status: string,
): Promise<ApiResponse<BloodRequest>> => {
  const response = await api.patch(`/api/blood-requests/${id}/status`, { status });
  return response.data;
};

// ─── Cancel ───────────────────────────────────────────────────────────────────

export const cancelBloodRequest = async (
  id: string,
): Promise<ApiResponse<BloodRequest>> => {
  const response = await api.post(`/api/blood-requests/${id}/cancel`);
  return response.data;
};
