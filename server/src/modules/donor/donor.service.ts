/**
 * Donor service — nearby search and eligibility helpers.
 *
 * Uses MongoDB's native $near geospatial operator against the existing
 * 2dsphere index on User.location so all distance filtering happens in
 * the database, not in JavaScript.
 */

import mongoose from "mongoose";
import type { PipelineStage } from "mongoose";
import User from "../user/user.model";
import { getCompatibleDonorGroups } from "../../shared/blood-compatibility";
import type { BloodGroup } from "../user/user.types";
import type { NearbyDonorsQuery } from "./donor.validation";

// ─── Public shape returned to callers ─────────────────────────────────────────

export interface NearbyDonorResult {
  _id: string;
  firstName: string | undefined;
  lastName: string | undefined;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  isVerified: boolean;
  /** Straight-line distance in metres returned by MongoDB */
  distanceMetres: number;
  /** Rounded to 2 decimal places for readability */
  distanceKm: number;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
}

// ─── Internal pipeline builder ────────────────────────────────────────────────

type AggResult = {
  _id: { toString(): string };
  firstName?: string;
  lastName?: string;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  isVerified: boolean;
  location: { type: "Point"; coordinates: [number, number] };
  distanceMetres: number;
};

const buildNearbyPipeline = (
  longitude: number,
  latitude: number,
  radiusMetres: number,
  compatibleGroups: BloodGroup[],
  limit: number,
): PipelineStage[] => [
  {
    $geoNear: {
      near: {
        type: "Point" as const,
        coordinates: [longitude, latitude] as [number, number],
      },
      distanceField: "distanceMetres",
      maxDistance: radiusMetres,
      spherical: true,
      query: {
        role: "donor",
        isAvailable: true,
        bloodGroup: { $in: compatibleGroups },
        location: { $exists: true, $ne: null },
      },
    },
  } as PipelineStage,
  { $limit: limit },
  {
    $project: {
      _id: 1,
      firstName: 1,
      lastName: 1,
      bloodGroup: 1,
      isAvailable: 1,
      isVerified: 1,
      location: 1,
      distanceMetres: 1,
    },
  },
];

const mapResult = (doc: AggResult): NearbyDonorResult => ({
  _id: doc._id.toString(),
  firstName: doc.firstName,
  lastName: doc.lastName,
  bloodGroup: doc.bloodGroup,
  isAvailable: doc.isAvailable,
  isVerified: doc.isVerified,
  location: doc.location,
  distanceMetres: Math.round(doc.distanceMetres),
  distanceKm: Math.round((doc.distanceMetres / 1000) * 100) / 100,
});

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Find available, eligible donors near a coordinate who are compatible
 * with the requested blood group.
 *
 * Uses $geoNear aggregation so MongoDB computes distances server-side
 * and the result set is already sorted by proximity.
 *
 * For critical/urgent requests, if fewer than `minResults` donors are
 * found in the initial radius, the search automatically escalates to
 * wider radii (2× then 4× the original) until `limit` results are found
 * or all escalation steps are exhausted.
 *
 * Compatibility and donor eligibility are always enforced regardless of urgency.
 *
 * @param query  - Validated query parameters.
 * @param urgency - Optional urgency level to trigger escalation ('critical' | 'urgent').
 * @returns      - Array of nearby donor summaries, sorted nearest-first.
 */
export const findNearbyDonors = async (
  query: NearbyDonorsQuery,
  urgency?: string,
): Promise<NearbyDonorResult[]> => {
  const { bloodGroup, latitude, longitude, radiusKm, limit } = query;

  // Determine compatible donor blood groups for the requested recipient group
  const compatibleGroups = getCompatibleDonorGroups(bloodGroup as BloodGroup);
  const radiusMetres = radiusKm * 1000;

  const pipeline = buildNearbyPipeline(longitude, latitude, radiusMetres, compatibleGroups, limit);
  const rawResults = await User.aggregate<AggResult>(pipeline);

  // ── Urgency-based escalation ──────────────────────────────────────────────
  // Only escalate for critical/urgent requests that haven't met a minimum threshold.
  const MIN_RESULTS_BEFORE_ESCALATION = 3;
  const shouldEscalate =
    (urgency === "critical" || urgency === "urgent") &&
    rawResults.length < MIN_RESULTS_BEFORE_ESCALATION;

  if (shouldEscalate) {
    // Escalation steps: 2× radius, then 4× radius (capped at 200 km)
    const MAX_RADIUS_METRES = 200_000;
    const escalationFactors = urgency === "critical" ? [2, 4] : [2];

    for (const factor of escalationFactors) {
      const escalatedRadius = Math.min(radiusMetres * factor, MAX_RADIUS_METRES);
      const escalatedPipeline = buildNearbyPipeline(
        longitude, latitude, escalatedRadius, compatibleGroups, limit,
      );
      const escalatedResults = await User.aggregate<AggResult>(escalatedPipeline);

      if (escalatedResults.length >= MIN_RESULTS_BEFORE_ESCALATION) {
        return escalatedResults.map(mapResult);
      }

      // Keep the wider result if it found at least something more
      if (escalatedResults.length > rawResults.length) {
        return escalatedResults.map(mapResult);
      }
    }
  }

  return rawResults.map(mapResult);
};

/**
 * Verify that a specific donor (by ID) is currently eligible to donate.
 * Used by the response workflow before accepting a donor response.
 *
 * Returns the donor document (without password) if eligible, or throws.
 *
 * firstName/lastName are included in the projection so callers that need the
 * donor's display name do not have to issue a second read for the same user.
 */
export const assertDonorEligible = async (donorId: string): Promise<{
  _id: string;
  firstName?: string;
  lastName?: string;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  isVerified: boolean;
}> => {
  const donor = await User.findById(donorId)
    .select("role firstName lastName bloodGroup isAvailable isVerified location")
    .lean();

  if (!donor) {
    throw new Error("Donor not found.");
  }
  if (donor.role !== "donor") {
    throw new Error("User is not a donor.");
  }
  if (!donor.isAvailable) {
    throw new Error("Donor is not currently available.");
  }
  if (!donor.bloodGroup) {
    throw new Error("Donor does not have a blood group set.");
  }

  return {
    _id: donor._id.toString(),
    firstName: donor.firstName,
    lastName: donor.lastName,
    bloodGroup: donor.bloodGroup as BloodGroup,
    isAvailable: donor.isAvailable,
    isVerified: donor.isVerified,
  };
};
