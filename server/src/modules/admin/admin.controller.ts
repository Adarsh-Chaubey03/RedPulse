/**
 * Admin controller — thin layer that validates input and delegates to admin.service.
 *
 * All routes here require authenticate + authorize('admin') middleware.
 * The user's role is always read from the server-side JWT — never from the request body.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import {
  getPlatformStats,
  listUsers,
  getUserById,
  verifyUser,
  rejectUser,
  deactivateUser,
  reactivateUser,
  adminListBloodRequests,
  getAuditLogs,
  getPendingVerificationUsers,
} from "./admin.service";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const listUsersQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).optional().default(1),
  limit:       z.coerce.number().int().min(1).max(100).optional().default(20),
  role:        z.enum(["donor", "patient", "hospital", "bloodBank", "admin"]).optional(),
  isVerified:  z.enum(["true", "false"]).transform(v => v === "true").optional(),
  isAvailable: z.enum(["true", "false"]).transform(v => v === "true").optional(),
  search:      z.string().trim().optional(),
});

const listRequestsQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).optional().default(1),
  limit:       z.coerce.number().int().min(1).max(100).optional().default(20),
  status:      z.string().optional(),
  urgency:     z.string().optional(),
  bloodGroup:  z.string().optional(),
});

const auditLogsQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(20),
  adminId:  z.string().optional(),
  targetId: z.string().optional(),
});

const rejectBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const requireAdmin = (req: Request, res: Response): string | null => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
      errors:  ["Missing user context."],
    });
    return null;
  }
  return userId;
};

const handleServiceError = (res: Response, error: unknown): void => {
  const err = error as Error & { statusCode?: number };
  const message = err.message || "Server error.";
  const status  = err.statusCode ?? 500;
  res.status(status).json({ success: false, message, errors: [message] });
};

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;
    const stats = await getPlatformStats();
    res.status(200).json({ success: true, message: "Platform stats retrieved.", data: stats });
  } catch (error) { handleServiceError(res, error); }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;

    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid query.", errors: parsed.error.issues.map(i => i.message) });
      return;
    }

    const result = await listUsers(parsed.data);
    res.status(200).json({ success: true, message: "Users retrieved.", data: result });
  } catch (error) { handleServiceError(res, error); }
};

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;

    const user = await getUserById(String(req.params.id));
    if (!user) {
      res.status(404).json({ success: false, message: "User not found.", errors: ["No user found."] });
      return;
    }
    res.status(200).json({ success: true, message: "User retrieved.", data: user });
  } catch (error) { handleServiceError(res, error); }
};

// ─── PATCH /api/admin/users/:id/verify ───────────────────────────────────────

export const verifyUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = requireAdmin(req, res);
    if (!adminId) return;

    await verifyUser(adminId, String(req.params.id));
    res.status(200).json({ success: true, message: "User verified successfully.", data: null });
  } catch (error) { handleServiceError(res, error); }
};

// ─── PATCH /api/admin/users/:id/reject ───────────────────────────────────────

export const rejectUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = requireAdmin(req, res);
    if (!adminId) return;

    const parsed = rejectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid request body.", errors: parsed.error.issues.map(i => i.message) });
      return;
    }

    await rejectUser(adminId, String(req.params.id), parsed.data.reason);
    res.status(200).json({ success: true, message: "User verification rejected.", data: null });
  } catch (error) { handleServiceError(res, error); }
};

// ─── PATCH /api/admin/users/:id/deactivate ───────────────────────────────────

export const deactivateUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = requireAdmin(req, res);
    if (!adminId) return;

    await deactivateUser(adminId, String(req.params.id));
    res.status(200).json({ success: true, message: "Account deactivated.", data: null });
  } catch (error) { handleServiceError(res, error); }
};

// ─── PATCH /api/admin/users/:id/reactivate ───────────────────────────────────

export const reactivateUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = requireAdmin(req, res);
    if (!adminId) return;

    await reactivateUser(adminId, String(req.params.id));
    res.status(200).json({ success: true, message: "Account reactivated.", data: null });
  } catch (error) { handleServiceError(res, error); }
};

// ─── GET /api/admin/blood-requests ───────────────────────────────────────────

export const getBloodRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;

    const parsed = listRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid query.", errors: parsed.error.issues.map(i => i.message) });
      return;
    }

    const result = await adminListBloodRequests(parsed.data);
    res.status(200).json({ success: true, message: "Blood requests retrieved.", data: result });
  } catch (error) { handleServiceError(res, error); }
};

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────

export const getAuditLogsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;

    const parsed = auditLogsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid query.", errors: parsed.error.issues.map(i => i.message) });
      return;
    }

    const result = await getAuditLogs(parsed.data);
    res.status(200).json({ success: true, message: "Audit logs retrieved.", data: result });
  } catch (error) { handleServiceError(res, error); }
};

// ─── GET /api/admin/pending-verification ─────────────────────────────────────

export const getPendingVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!requireAdmin(req, res)) return;

    const users = await getPendingVerificationUsers(10);
    res.status(200).json({ success: true, message: "Pending verification users retrieved.", data: users });
  } catch (error) { handleServiceError(res, error); }
};
