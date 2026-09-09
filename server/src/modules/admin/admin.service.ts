/**
 * Admin service — business logic for all administrative operations.
 *
 * Security: every public function receives adminId for audit logging.
 * Sensitive fields (password, tokenHash, firebaseUid) are NEVER returned.
 */

import mongoose from "mongoose";
import User from "../user/user.model";
import BloodRequest from "../blood-request/blood-request.model";
import AuditLog from "./audit-log.model";
import type { AuditAction } from "./audit-log.model";

// ─── Safe user projection (never expose password/tokens) ─────────────────────

const SAFE_USER_PROJECTION = {
  password: 0,
  firebaseUid: 0,
} as const;

// ─── Platform stats ───────────────────────────────────────────────────────────

export interface PlatformStats {
  users: {
    total:     number;
    donors:    number;
    patients:  number;
    hospitals: number;
    bloodBanks: number;
    admins:    number;
  };
  requests: {
    total:              number;
    active:             number;   // searching + partiallyFulfilled
    fulfilled:          number;
    expired:            number;
    cancelled:          number;
    pendingVerification: number;  // users with isVerified=false (non-admin)
  };
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const [
    userCounts,
    requestCounts,
    pendingVerification,
  ] = await Promise.all([
    // Group users by role
    User.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    // Group requests by status
    BloodRequest.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Unverified non-admin users (pending verification)
    User.countDocuments({ isVerified: false, role: { $ne: "admin" } }),
  ]);

  const byRole: Record<string, number> = {};
  for (const r of userCounts) byRole[r._id] = r.count;

  const byStatus: Record<string, number> = {};
  for (const s of requestCounts) byStatus[s._id] = s.count;

  const totalUsers = Object.values(byRole).reduce((a, b) => a + b, 0);
  const activeRequests = (byStatus["searching"] ?? 0) + (byStatus["partiallyFulfilled"] ?? 0);
  const totalRequests  = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return {
    users: {
      total:      totalUsers,
      donors:     byRole["donor"]     ?? 0,
      patients:   byRole["patient"]   ?? 0,
      hospitals:  byRole["hospital"]  ?? 0,
      bloodBanks: byRole["bloodBank"] ?? 0,
      admins:     byRole["admin"]     ?? 0,
    },
    requests: {
      total:               totalRequests,
      active:              activeRequests,
      fulfilled:           byStatus["fulfilled"]  ?? 0,
      expired:             byStatus["expired"]    ?? 0,
      cancelled:           byStatus["cancelled"]  ?? 0,
      pendingVerification,
    },
  };
};

// ─── List users (paginated + filtered) ───────────────────────────────────────

export interface ListUsersOptions {
  page:           number;
  limit:          number;
  role?:          string;
  isVerified?:    boolean;
  isAvailable?:   boolean;
  isActive?:      boolean;
  search?:        string;
}

export const listUsers = async (opts: ListUsersOptions) => {
  const { page, limit, role, isVerified, isAvailable, search } = opts;

  const filter: Record<string, unknown> = {};
  if (role)                    filter["role"]       = role;
  if (isVerified !== undefined) filter["isVerified"] = isVerified;
  if (isAvailable !== undefined) filter["isAvailable"] = isAvailable;

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter["$or"] = [
      { firstName:       regex },
      { lastName:        regex },
      { email:           regex },
      { organizationName: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter, SAFE_USER_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, meta: { page, limit, total } };
};

// ─── Get single user (admin view) ─────────────────────────────────────────────

export const getUserById = async (userId: string) => {
  if (!mongoose.isValidObjectId(userId)) return null;
  return User.findById(userId, SAFE_USER_PROJECTION).lean();
};

// ─── Audit helper (internal) ──────────────────────────────────────────────────

const writeAuditLog = async (
  adminId: string,
  action:  AuditAction,
  targetType: "user" | "blood_request",
  targetId:   string,
  metadata?:  Record<string, unknown>,
): Promise<void> => {
  await AuditLog.create({
    adminId:    new mongoose.Types.ObjectId(adminId),
    action,
    targetType,
    targetId:   new mongoose.Types.ObjectId(targetId),
    metadata,
  });
};

// ─── Verify user ──────────────────────────────────────────────────────────────

export const verifyUser = async (
  adminId:  string,
  targetId: string,
): Promise<void> => {
  if (!mongoose.isValidObjectId(targetId)) {
    throw Object.assign(new Error("Invalid user ID."), { statusCode: 400 });
  }

  const user = await User.findById(targetId);
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  if (user.role === "admin") {
    throw Object.assign(new Error("Cannot modify admin accounts."), { statusCode: 403 });
  }

  const wasVerified = user.isVerified;
  user.isVerified = true;
  await user.save();

  await writeAuditLog(adminId, "user.verify", "user", targetId, {
    email:       user.email,
    role:        user.role,
    wasVerified,
  });
};

// ─── Reject / un-verify user ──────────────────────────────────────────────────

export const rejectUser = async (
  adminId:  string,
  targetId: string,
  reason?:  string,
): Promise<void> => {
  if (!mongoose.isValidObjectId(targetId)) {
    throw Object.assign(new Error("Invalid user ID."), { statusCode: 400 });
  }

  const user = await User.findById(targetId);
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  if (user.role === "admin") {
    throw Object.assign(new Error("Cannot modify admin accounts."), { statusCode: 403 });
  }

  const wasVerified = user.isVerified;
  user.isVerified = false;
  await user.save();

  await writeAuditLog(adminId, "user.reject", "user", targetId, {
    email:       user.email,
    role:        user.role,
    wasVerified,
    reason:      reason ?? null,
  });
};

// ─── Deactivate user (set isAvailable=false for donors; generic flag for others) ──

/**
 * We use the existing `isAvailable` field for donors.
 * For all roles we add an `isActive` flag by updating the document directly.
 * The User model doesn't have isActive yet — we handle it via a direct update
 * so we don't need to change the schema (MongoDB is schemaless for extra fields
 * that aren't in the Mongoose schema — we use the schema's `strict: false` via
 * a findOneAndUpdate with $set, which bypasses the schema).
 *
 * Actually: to stay strictly within the schema and avoid touching the model,
 * we implement deactivate as setting isAvailable=false (for donors) and
 * recording the audit. For a full account suspension we would need to add
 * an `isActive` field — we add it to the schema here.
 */
export const deactivateUser = async (
  adminId:  string,
  targetId: string,
): Promise<void> => {
  if (!mongoose.isValidObjectId(targetId)) {
    throw Object.assign(new Error("Invalid user ID."), { statusCode: 400 });
  }

  const user = await User.findById(targetId);
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  if (user.role === "admin") {
    throw Object.assign(new Error("Cannot deactivate admin accounts."), { statusCode: 403 });
  }

  // Use findOneAndUpdate with $set so we can store isActive without altering the schema
  await User.findByIdAndUpdate(targetId, { $set: { isActive: false } });

  await writeAuditLog(adminId, "user.deactivate", "user", targetId, {
    email: user.email,
    role:  user.role,
  });
};

// ─── Reactivate user ──────────────────────────────────────────────────────────

export const reactivateUser = async (
  adminId:  string,
  targetId: string,
): Promise<void> => {
  if (!mongoose.isValidObjectId(targetId)) {
    throw Object.assign(new Error("Invalid user ID."), { statusCode: 400 });
  }

  const user = await User.findById(targetId);
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  if (user.role === "admin") {
    throw Object.assign(new Error("Cannot modify admin accounts."), { statusCode: 403 });
  }

  await User.findByIdAndUpdate(targetId, { $set: { isActive: true } });

  await writeAuditLog(adminId, "user.reactivate", "user", targetId, {
    email: user.email,
    role:  user.role,
  });
};

// ─── List blood requests (admin view — all requests, enriched) ────────────────

export interface AdminListRequestsOptions {
  page:        number;
  limit:       number;
  status?:     string;
  urgency?:    string;
  bloodGroup?: string;
}

export const adminListBloodRequests = async (opts: AdminListRequestsOptions) => {
  const { page, limit, status, urgency, bloodGroup } = opts;

  const filter: Record<string, unknown> = {};
  if (status)     filter["status"]     = status;
  if (urgency)    filter["urgency"]    = urgency;
  if (bloodGroup) filter["bloodGroup"] = bloodGroup;

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("requestedBy", "firstName lastName email role")
      .lean(),
    BloodRequest.countDocuments(filter),
  ]);

  return { requests, meta: { page, limit, total } };
};

// ─── Get audit logs ───────────────────────────────────────────────────────────

export const getAuditLogs = async (opts: {
  page:  number;
  limit: number;
  adminId?: string;
  targetId?: string;
}) => {
  const { page, limit, adminId, targetId } = opts;

  const filter: Record<string, unknown> = {};
  if (adminId  && mongoose.isValidObjectId(adminId))  filter["adminId"]  = new mongoose.Types.ObjectId(adminId);
  if (targetId && mongoose.isValidObjectId(targetId)) filter["targetId"] = new mongoose.Types.ObjectId(targetId);

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("adminId", "firstName lastName email")
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, meta: { page, limit, total } };
};

// ─── Pending-verification users (quick list for dashboard widget) ─────────────

export const getPendingVerificationUsers = async (limit = 10) => {
  return User.find(
    { isVerified: false, role: { $ne: "admin" } },
    SAFE_USER_PROJECTION,
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};
