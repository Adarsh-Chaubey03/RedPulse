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
  // ── Existing routes (unchanged) ──────────────────────────────────────────
  router.post("/api/blood-requests",             authenticate, createRequest);
  router.get("/api/blood-requests",              authenticate, listRequests);
  router.get("/api/blood-requests/:id",          authenticate, getRequest);
  router.patch("/api/blood-requests/:id/status", authenticate, updateStatus);
  router.post("/api/blood-requests/:id/cancel",  authenticate, cancelRequest);

  // ── Phase 2: donor discovery + response ──────────────────────────────────

  /**
   * GET /api/blood-requests/discover
   * Donor-only: returns compatible, active requests not yet responded to.
   * Must come BEFORE /:id routes so Express doesn't treat "discover" as an id.
   */
  router.get("/api/blood-requests/discover", authenticate, discoverRequests);

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
