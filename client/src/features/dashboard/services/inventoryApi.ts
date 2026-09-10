/**
 * Inventory API service — wraps /api/inventory endpoints.
 * Only blood-bank users (or admins) can call these endpoints.
 */

import { api } from '../../auth/services/authApi';

export interface InventoryEntry {
  _id: string;
  bloodBankId: string;
  bloodGroup: string;
  units: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── GET /api/inventory ───────────────────────────────────────────────────────
export const getMyInventory = async (): Promise<ApiResponse<{ inventory: InventoryEntry[]; queryMs: number }>> => {
  const res = await api.get('/api/inventory');
  return res.data;
};

// ─── PUT /api/inventory/:bloodGroup ──────────────────────────────────────────
export const updateInventoryEntry = async (
  bloodGroup: string,
  units: number,
): Promise<ApiResponse<InventoryEntry>> => {
  const res = await api.put(`/api/inventory/${encodeURIComponent(bloodGroup)}`, { units });
  return res.data;
};

// ─── PUT /api/inventory (bulk) ────────────────────────────────────────────────
export const bulkUpdateInventory = async (
  inventory: Array<{ bloodGroup: string; units: number }>,
): Promise<ApiResponse<{ inventory: InventoryEntry[] }>> => {
  const res = await api.put('/api/inventory', { inventory });
  return res.data;
};
