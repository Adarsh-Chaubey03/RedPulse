import { z } from "zod";
import { ALL_BLOOD_GROUPS } from "./inventory.types";

const bloodGroupEnum = ALL_BLOOD_GROUPS as unknown as [string, ...string[]];

// ─── Update a single blood group ──────────────────────────────────────────────
export const updateInventoryEntrySchema = z.object({
  bloodGroup: z
    .string()
    .refine((v) => (ALL_BLOOD_GROUPS as readonly string[]).includes(v), {
      message: `Blood group must be one of: ${ALL_BLOOD_GROUPS.join(", ")}.`,
    }),
  units: z
    .number({ error: "units must be a number." })
    .int("units must be a whole number.")
    .min(0, "Units cannot be negative."),
});

// ─── Bulk update all groups ───────────────────────────────────────────────────
const inventoryEntrySchema = z.object({
  bloodGroup: z.enum(bloodGroupEnum as [string, ...string[]]).refine(
    (v) => (ALL_BLOOD_GROUPS as readonly string[]).includes(v),
    { message: `Blood group must be one of: ${ALL_BLOOD_GROUPS.join(", ")}.` },
  ),
  units: z
    .number({ error: "units must be a number." })
    .int("units must be a whole number.")
    .min(0, "Units cannot be negative."),
});

export const bulkUpdateInventorySchema = z.object({
  inventory: z
    .array(inventoryEntrySchema)
    .min(1, "At least one inventory entry is required."),
});

export type UpdateInventoryEntryInput = z.infer<typeof updateInventoryEntrySchema>;
export type BulkUpdateInventoryInput  = z.infer<typeof bulkUpdateInventorySchema>;
