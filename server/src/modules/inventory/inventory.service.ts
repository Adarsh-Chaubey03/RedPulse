import mongoose from "mongoose";
import Inventory from "./inventory.model";
import type { BloodGroup, IInventoryEntryDocument } from "./inventory.types";
import { ALL_BLOOD_GROUPS } from "./inventory.types";

// ─── Get full inventory for a blood bank ─────────────────────────────────────

export const getInventory = async (
  bloodBankId: string,
): Promise<IInventoryEntryDocument[]> => {
  if (!mongoose.isValidObjectId(bloodBankId)) {
    throw Object.assign(new Error("Invalid blood bank ID."), { statusCode: 400 });
  }

  const startMs = Date.now();
  const bankObjectId = new mongoose.Types.ObjectId(bloodBankId);

  let entries = await Inventory.find({ bloodBankId: bankObjectId }).sort({
    bloodGroup: 1,
  });

  // Ensure all 8 blood groups are returned (even if units = 0).
  // This previously issued one sequential Inventory.create() per missing group —
  // up to 8 extra serial round-trips on a blood bank's first load. A single
  // bulkWrite of upserts replaces them; using upsert + $setOnInsert rather than
  // insert also makes two concurrent first loads safe instead of racing into a
  // duplicate-key error.
  const present = new Set(entries.map((e) => e.bloodGroup));
  const missing = ALL_BLOOD_GROUPS.filter((bg) => !present.has(bg));

  if (missing.length > 0) {
    await Inventory.bulkWrite(
      missing.map((bg) => ({
        updateOne: {
          filter: { bloodBankId: bankObjectId, bloodGroup: bg },
          update: {
            $setOnInsert: {
              bloodBankId: bankObjectId,
              bloodGroup: bg,
              units: 0,
            },
          },
          upsert: true,
        },
      })),
    );

    entries = await Inventory.find({ bloodBankId: bankObjectId }).sort({
      bloodGroup: 1,
    });
  }

  // Emit in ALL_BLOOD_GROUPS order — same ordering the previous loop produced.
  const entryMap = new Map(entries.map((e) => [e.bloodGroup, e]));
  const result = ALL_BLOOD_GROUPS.map((bg) => entryMap.get(bg)).filter(
    (e): e is IInventoryEntryDocument => e !== undefined,
  );

  const queryMs = Date.now() - startMs;
  // Attach queryMs for controller reporting (non-standard but useful)
  (result as unknown as { queryMs: number }).queryMs = queryMs;

  return result;
};

// ─── Upsert inventory entry for one blood group ───────────────────────────────

export interface UpdateInventoryInput {
  bloodBankId: string;
  bloodGroup:  BloodGroup;
  units:       number;
}

export const upsertInventoryEntry = async (
  input: UpdateInventoryInput,
): Promise<IInventoryEntryDocument> => {
  const { bloodBankId, bloodGroup, units } = input;

  if (!mongoose.isValidObjectId(bloodBankId)) {
    throw Object.assign(new Error("Invalid blood bank ID."), { statusCode: 400 });
  }
  if (units < 0) {
    throw Object.assign(new Error("Units cannot be negative."), { statusCode: 400 });
  }

  const entry = await Inventory.findOneAndUpdate(
    {
      bloodBankId: new mongoose.Types.ObjectId(bloodBankId),
      bloodGroup,
    },
    { $set: { units } },
    { new: true, upsert: true, runValidators: true },
  );

  return entry;
};

// ─── Bulk upsert (set all 8 groups at once) ───────────────────────────────────

export interface BulkInventoryInput {
  bloodBankId: string;
  inventory: Array<{ bloodGroup: BloodGroup; units: number }>;
}

export const bulkUpsertInventory = async (
  input: BulkInventoryInput,
): Promise<IInventoryEntryDocument[]> => {
  const { bloodBankId, inventory } = input;

  if (!mongoose.isValidObjectId(bloodBankId)) {
    throw Object.assign(new Error("Invalid blood bank ID."), { statusCode: 400 });
  }

  const negativeEntry = inventory.find((e) => e.units < 0);
  if (negativeEntry) {
    throw Object.assign(
      new Error(`Units cannot be negative for ${negativeEntry.bloodGroup}.`),
      { statusCode: 400 },
    );
  }

  // Execute all upserts concurrently
  const results = await Promise.all(
    inventory.map((entry) =>
      Inventory.findOneAndUpdate(
        {
          bloodBankId: new mongoose.Types.ObjectId(bloodBankId),
          bloodGroup: entry.bloodGroup,
        },
        { $set: { units: entry.units } },
        { new: true, upsert: true, runValidators: true },
      ),
    ),
  );

  return results.filter((r): r is NonNullable<typeof r> => r !== null) as IInventoryEntryDocument[];
};
