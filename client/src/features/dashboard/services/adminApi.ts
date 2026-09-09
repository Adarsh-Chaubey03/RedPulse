/**
 * Admin API service.
 * All calls require an authenticated admin JWT — the axios interceptor
 * in authApi attaches the Bearer token automatically.
 */

import { api } from '../../auth/services/authApi';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Platform stats ───────────────────────────────────────────────────────────

export interface PlatformStats {
  users: {
    total: number;
    donors: number;
    patients: number;
    hospitals: number;
    bloodBanks: number;
    admins: number;
  };
  requests: {
    total: number;
    active: number;
    fulfilled: number;
    expired: number;
    cancelled: number;
    pendingVerification: number;
  };
}

export const getAdminStats = async (): Promise<ApiResponse<PlatformStats>> => {
  const res = await api.get('/api/admin/stats');
  return res.data;
};

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  isVerified: boolean;
  isAvailable: boolean;
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  isVerified?: boolean;
  isAvailable?: boolean;
  search?: string;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
}

export const getAdminUsers = async (
  params: ListUsersParams = {},
): Promise<ApiResponse<{ users: AdminUser[]; meta: ListMeta }>> => {
  const res = await api.get('/api/admin/users', { params });
  return res.data;
};

export const getAdminUser = async (
  id: string,
): Promise<ApiResponse<AdminUser>> => {
  const res = await api.get(`/api/admin/users/${id}`);
  return res.data;
};

export const verifyAdminUser = async (
  id: string,
): Promise<ApiResponse<null>> => {
  const res = await api.patch(`/api/admin/users/${id}/verify`);
  return res.data;
};

export const rejectAdminUser = async (
  id: string,
  reason?: string,
): Promise<ApiResponse<null>> => {
  const res = await api.patch(`/api/admin/users/${id}/reject`, { reason });
  return res.data;
};

export const deactivateAdminUser = async (
  id: string,
): Promise<ApiResponse<null>> => {
  const res = await api.patch(`/api/admin/users/${id}/deactivate`);
  return res.data;
};

export const reactivateAdminUser = async (
  id: string,
): Promise<ApiResponse<null>> => {
  const res = await api.patch(`/api/admin/users/${id}/reactivate`);
  return res.data;
};

// ─── Pending verification ─────────────────────────────────────────────────────

export const getPendingVerification = async (): Promise<ApiResponse<AdminUser[]>> => {
  const res = await api.get('/api/admin/pending-verification');
  return res.data;
};

// ─── Blood requests (admin view) ──────────────────────────────────────────────

export interface AdminBloodRequest {
  _id: string;
  requestedBy: { _id: string; firstName?: string; lastName?: string; email: string; role: string } | string;
  patientName: string;
  bloodGroup: string;
  bloodComponent: string;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalName: string;
  urgency: string;
  status: string;
  requiredAt: string;
  createdAt: string;
  donorResponses: unknown[];
}

export interface ListAdminRequestsParams {
  page?: number;
  limit?: number;
  status?: string;
  urgency?: string;
  bloodGroup?: string;
}

export const getAdminBloodRequests = async (
  params: ListAdminRequestsParams = {},
): Promise<ApiResponse<{ requests: AdminBloodRequest[]; meta: ListMeta }>> => {
  const res = await api.get('/api/admin/blood-requests', { params });
  return res.data;
};

// ─── Audit logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  adminId: { _id: string; firstName?: string; lastName?: string; email: string } | string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const getAuditLogs = async (params: {
  page?: number;
  limit?: number;
  adminId?: string;
  targetId?: string;
} = {}): Promise<ApiResponse<{ logs: AuditLog[]; meta: ListMeta }>> => {
  const res = await api.get('/api/admin/audit-logs', { params });
  return res.data;
};
