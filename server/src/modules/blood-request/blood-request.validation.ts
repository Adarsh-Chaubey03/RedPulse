import { z } from "zod";

// ─── Shared constants ─────────────────────────────────────────────────────────

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const BLOOD_COMPONENTS = [
  "Whole Blood",
  "Red Blood Cells",
  "Plasma",
  "Platelets",
] as const;

export const URGENCY_VALUES = ["critical", "urgent", "normal"] as const;

export const STATUS_VALUES = [
  "searching",
  "partiallyFulfilled",
  "fulfilled",
  "expired",
  "cancelled",
] as const;

// ─── Coordinate sub-schema ────────────────────────────────────────────────────
// Zod v4: required_error is not supported — use .min() / plain message param instead

const hospitalLocationSchema = z.object({
  latitude: z
    .number("Hospital latitude is required.")
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90,  "Latitude must be between -90 and 90."),
  longitude: z
    .number("Hospital longitude is required.")
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180,  "Longitude must be between -180 and 180."),
});

// ─── Create request ───────────────────────────────────────────────────────────

export const createBloodRequestSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(1, "Patient name is required."),

  bloodGroup: z
    .string()
    .min(1, "Blood group is required.")
    .refine((v) => BLOOD_GROUPS.includes(v as typeof BLOOD_GROUPS[number]), {
      message: `Blood group must be one of: ${BLOOD_GROUPS.join(", ")}.`,
    }),

  bloodComponent: z
    .string()
    .min(1, "Blood component is required.")
    .refine((v) => BLOOD_COMPONENTS.includes(v as typeof BLOOD_COMPONENTS[number]), {
      message: `Blood component must be one of: ${BLOOD_COMPONENTS.join(", ")}.`,
    }),

  unitsRequired: z
    .number("Units required must be a number.")
    .int("Units required must be a whole number.")
    .min(1, "Units required must be at least 1."),

  hospitalName: z
    .string()
    .trim()
    .min(1, "Hospital name is required."),

  hospitalLocation: hospitalLocationSchema,

  requiredAt: z
    .string()
    .min(1, "Required date/time is required.")
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid required date/time." })
    .refine((v) => new Date(v) > new Date(), { message: "Required date/time must be in the future." }),

  /**
   * Optional explicit expiration datetime (ISO string).
   * If omitted, the service applies urgency-based defaults:
   *   critical → 12 h, urgent → 24 h, normal → 48 h
   */
  expiresAt: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid expiration date/time." })
    .refine((v) => new Date(v) > new Date(), { message: "Expiration must be in the future." })
    .optional(),

  urgency: z
    .string()
    .refine((v) => URGENCY_VALUES.includes(v as typeof URGENCY_VALUES[number]), {
      message: `Urgency must be one of: ${URGENCY_VALUES.join(", ")}.`,
    })
    .optional()
    .default("normal"),

  additionalInformation: z.string().trim().optional(),
});

export type CreateBloodRequestInput = z.infer<typeof createBloodRequestSchema>;

// ─── Update status ────────────────────────────────────────────────────────────

export const updateStatusSchema = z.object({
  status: z
    .string()
    .min(1, "status is required.")
    .refine((v) => STATUS_VALUES.includes(v as typeof STATUS_VALUES[number]), {
      message: `Status must be one of: ${STATUS_VALUES.join(", ")}.`,
    }),
});

// ─── List query params ────────────────────────────────────────────────────────

export const listQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).optional().default(1),
  limit:       z.coerce.number().int().min(1).max(100).optional().default(20),
  status:      z.string().refine(
    v => STATUS_VALUES.includes(v as typeof STATUS_VALUES[number]),
    { message: `status must be one of: ${STATUS_VALUES.join(", ")}.` }
  ).optional(),
  bloodGroup:  z.string().refine(
    v => BLOOD_GROUPS.includes(v as typeof BLOOD_GROUPS[number]),
    { message: `bloodGroup must be one of: ${BLOOD_GROUPS.join(", ")}.` }
  ).optional(),
  urgency:     z.string().refine(
    v => URGENCY_VALUES.includes(v as typeof URGENCY_VALUES[number]),
    { message: `urgency must be one of: ${URGENCY_VALUES.join(", ")}.` }
  ).optional(),
  requestedBy: z.string().optional(),
});
