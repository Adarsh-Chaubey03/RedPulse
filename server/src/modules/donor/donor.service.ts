/**
 * Donor service — nearby search and eligibility helpers.
 *
 * Uses MongoDB's native $near geospatial operator against the existing
 * 2dsphere index on User.location so all distance filtering happens in
 * the database, not in JavaScript.
 */

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

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Find available, eligible donors near a coordinate who are compatible
 * with the requested blood group.
 *
 * Uses $geoNear aggregation so MongoDB computes distances server-side
 * and the result set is already sorted by proximity.
 *
 * @param query  - Validated query parameters.
 * @returns      - Array of nearby donor summaries, sorted nearest-first.
 */
export const findNearbyDonors = async (
  query: NearbyDonorsQuery,
): Promise<NearbyDonorResult[]> => {
  const { bloodGroup, latitude, longitude, radiusKm, limit } = query;

  // Determine compatible donor blood groups for the requested recipient group
  const compatibleGroups = getCompatibleDonorGroups(bloodGroup as BloodGroup);
  const radiusMetres = radiusKm * 1000;

  /**
   * $geoNear must be the first stage in an aggregation pipeline.
   * It automatically uses the 2dsphere index on `location`.
   *
   * distanceField: the aggregation adds a `distanceMetres` field to each doc.
   * query: pre-filter eligible donors before distance sorting (uses index).
   * maxDistance: in metres — MongoDB handles the radius cut-off.
   * spherical: true for GeoJSON Point coordinates.
   */
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
        },
        distanceField: "distanceMetres",
        maxDistance: radiusMetres,
        spherical: true,
        // Pre-filter: only eligible donors enter the pipeline
        query: {
          role: "donor",
          isAvailable: true,
          bloodGroup: { $in: compatibleGroups },
          location: { $exists: true, $ne: null },
        },
      },
    },
    // Hard limit — prevent huge result sets
    { $limit: limit },
    // Project only the fields callers need — never expose password/tokens
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

  const rawResults = await User.aggregate<AggResult>(pipeline);

  return rawResults.map((doc) => ({
    _id: doc._id.toString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    bloodGroup: doc.bloodGroup,
    isAvailable: doc.isAvailable,
    isVerified: doc.isVerified,
    location: doc.location,
    distanceMetres: Math.round(doc.distanceMetres),
    distanceKm: Math.round((doc.distanceMetres / 1000) * 100) / 100,
  }));
};

/**
 * Verify that a specific donor (by ID) is currently eligible to donate.
 * Used by the response workflow before accepting a donor response.
 *
 * Returns the donor document (without password) if eligible, or throws.
 */
export const assertDonorEligible = async (donorId: string): Promise<{
  _id: string;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  isVerified: boolean;
}> => {
  const donor = await User.findById(donorId).select(
    "role bloodGroup isAvailable isVerified location",
  );

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
    bloodGroup: donor.bloodGroup as BloodGroup,
    isAvailable: donor.isAvailable,
    isVerified: donor.isVerified,
  };
};
