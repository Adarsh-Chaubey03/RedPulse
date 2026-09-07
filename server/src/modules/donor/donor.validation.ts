import { z } from "zod";
import { ALL_BLOOD_GROUPS } from "../../shared/blood-compatibility";

// Max radius cap: 200 km — prevents extremely expensive geospatial queries
const MAX_RADIUS_KM = 200;
const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Validation schema for GET /api/donors/nearby query parameters.
 * All params arrive as strings from the query string; coerce where needed.
 */
export const nearbyDonorsQuerySchema = z.object({
  bloodGroup: z
    .string({ error: "bloodGroup is required." })
    .trim()
    .min(1, "bloodGroup is required.")
    .refine(
      (v) => (ALL_BLOOD_GROUPS as readonly string[]).includes(v),
      { message: `bloodGroup must be one of: ${ALL_BLOOD_GROUPS.join(", ")}.` },
    ),

  latitude: z.coerce
    .number({ error: "latitude must be a number." })
    .min(-90,  "latitude must be between -90 and 90.")
    .max(90,   "latitude must be between -90 and 90."),

  longitude: z.coerce
    .number({ error: "longitude must be a number." })
    .min(-180, "longitude must be between -180 and 180.")
    .max(180,  "longitude must be between -180 and 180."),

  radiusKm: z.coerce
    .number({ error: "radiusKm must be a number." })
    .min(0.1,   "radiusKm must be at least 0.1 km.")
    .max(MAX_RADIUS_KM, `radiusKm cannot exceed ${MAX_RADIUS_KM} km.`)
    .optional()
    .default(DEFAULT_RADIUS_KM),

  limit: z.coerce
    .number({ error: "limit must be a number." })
    .int("limit must be a whole number.")
    .min(1,         "limit must be at least 1.")
    .max(MAX_LIMIT, `limit cannot exceed ${MAX_LIMIT}.`)
    .optional()
    .default(DEFAULT_LIMIT),
});

export type NearbyDonorsQuery = z.infer<typeof nearbyDonorsQuerySchema>;
