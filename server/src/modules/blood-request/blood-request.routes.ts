import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  createRequest,
  listRequests,
  getRequest,
  updateStatus,
  cancelRequest,
} from "./blood-request.controller";
import {
  discoverRequests,
  respondToRequest,
  getRequestResponses,
} from "./donor-response.controller";

export const bloodRequestRoutes = (router: Router): void => {
  // ── IMPORTANT: specific named routes MUST come before /:id routes ──────────
  // Express matches routes in registration order. "discover" must be before /:id
  // or the string "discover" will be treated as a request ID parameter.

  /**
   * GET /api/blood-requests/discover
   * Donor-only: returns compatible, active requests not yet responded to.
   * Registered FIRST so Express does not match "discover" as /:id.
   */
  router.get("/api/blood-requests/discover", authenticate, discoverRequests);

  // ── CRUD routes ───────────────────────────────────────────────────────────
  router.post("/api/blood-requests",             authenticate, createRequest);
  router.get("/api/blood-requests",              authenticate, listRequests);
  router.get("/api/blood-requests/:id",          authenticate, getRequest);
  router.patch("/api/blood-requests/:id/status", authenticate, updateStatus);
  router.post("/api/blood-requests/:id/cancel",  authenticate, cancelRequest);

  /**
   * POST /api/blood-requests/:id/respond
   * Donor-only: records the donor's response to a specific request.
   */
  router.post("/api/blood-requests/:id/respond", authenticate, respondToRequest);

  /**
   * GET /api/blood-requests/:id/responses
   * Owner / admin / hospital: view all donor responses for a request.
   */
  router.get("/api/blood-requests/:id/responses", authenticate, getRequestResponses);
};
