import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { getNearbyDonors } from "./donor.controller";

export const donorRoutes = (router: Router): void => {
  /**
   * GET /api/donors/nearby
   *
   * Query params (all required unless noted):
   *   bloodGroup  string   — recipient blood group (e.g. "O+")
   *   latitude    number   — center point latitude
   *   longitude   number   — center point longitude
   *   radiusKm    number?  — search radius in km (default 10, max 200)
   *   limit       number?  — max results (default 20, max 100)
   *
   * Returns donors sorted nearest-first.
   */
  router.get("/api/donors/nearby", authenticate, getNearbyDonors);
};
