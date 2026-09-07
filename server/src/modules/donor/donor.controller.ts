/**
 * Donor controller — thin layer, all business logic lives in donor.service.ts
 */

import type { Request, Response } from "express";
import { nearbyDonorsQuerySchema } from "./donor.validation";
import { findNearbyDonors } from "./donor.service";

// ─── GET /api/donors/nearby ───────────────────────────────────────────────────
// Returns compatible, available donors near the given coordinates.
// Requires authentication — any authenticated user may search for donors
// (patients, hospitals, blood banks, admins).

export const getNearbyDonors = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Authentication guard
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: ["Missing user context."],
      });
      return;
    }

    // Validate query parameters
    const parsed = nearbyDonorsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const startMs = Date.now();
    const donors = await findNearbyDonors(parsed.data);
    const queryMs = Date.now() - startMs;

    res.status(200).json({
      success: true,
      message:
        donors.length > 0
          ? `Found ${donors.length} compatible donor(s) nearby.`
          : "No compatible donors found within the specified radius.",
      data: {
        donors,
        meta: {
          count: donors.length,
          bloodGroup: parsed.data.bloodGroup,
          radiusKm: parsed.data.radiusKm,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          queryMs,
        },
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Server error.";
    res.status(500).json({
      success: false,
      message: "Unable to retrieve nearby donors.",
      errors: [message],
    });
  }
};
