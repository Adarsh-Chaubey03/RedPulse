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
  const entries = await Inventory.find({
    bloodBankId: new mongoose.Types.ObjectId(bloodBankId),
  }).sort({ bloodGroup: 1 });

  // Ensure all 8 blood groups are returned (even if units = 0)
  const entryMap = new Map(entries.map((e) => [e.bloodGroup, e]));
  const result: IInventoryEntryDocument[] = [];

  for (const bg of ALL_BLOOD_GROUPS) {
    if (entryMap.has(bg)) {
      result.push(entryMap.get(bg)!);
    } else {
      // Auto-create missing entry with 0 units
      const created = await Inventory.create({
        bloodBankId: new mongoose.Types.ObjectId(bloodBankId),
        bloodGroup: bg,
        units: 0,
      });
      result.push(created);
    }
  }

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

  return results.filter((r): r is IInventoryEntryDocument => r !== null);
};
