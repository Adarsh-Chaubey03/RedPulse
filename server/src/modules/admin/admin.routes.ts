/**
 * Admin routes.
 *
 * Every route here requires:
 *   1. authenticate  — verifies JWT, populates req.user
 *   2. authorize('admin') — confirms the role in the JWT is 'admin'
 *
 * Role is NEVER trusted from client request body.
 */

import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize }     from "../../middleware/authorize";
import {
  getStats,
  getUsers,
  getUser,
  verifyUserHandler,
  rejectUserHandler,
  deactivateUserHandler,
  reactivateUserHandler,
  getBloodRequests,
  getAuditLogsHandler,
  getPendingVerification,
} from "./admin.controller";

export const adminRoutes = (router: Router): void => {
  const guard = [authenticate, authorize("admin")];

  // Platform stats
  router.get("/api/admin/stats",                 ...guard, getStats);

  // User management
  router.get("/api/admin/users",                 ...guard, getUsers);
  router.get("/api/admin/users/:id",             ...guard, getUser);
  router.patch("/api/admin/users/:id/verify",    ...guard, verifyUserHandler);
  router.patch("/api/admin/users/:id/reject",    ...guard, rejectUserHandler);
  router.patch("/api/admin/users/:id/deactivate",...guard, deactivateUserHandler);
  router.patch("/api/admin/users/:id/reactivate",...guard, reactivateUserHandler);

  // Blood request monitoring
  router.get("/api/admin/blood-requests",        ...guard, getBloodRequests);

  // Verification queue (unverified users)
  router.get("/api/admin/pending-verification",  ...guard, getPendingVerification);

  // Audit logs
  router.get("/api/admin/audit-logs",            ...guard, getAuditLogsHandler);
};
