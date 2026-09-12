import mongoose, { Schema } from "mongoose";
import type { IInventoryEntryDocument, InventoryModelType } from "./inventory.types";
import { ALL_BLOOD_GROUPS } from "./inventory.types";

const inventorySchema = new Schema<IInventoryEntryDocument>(
  {
    bloodBankId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Indexed via the { bloodBankId, bloodGroup } compound below, whose
      // prefix already serves bloodBankId-only lookups.
    },
    bloodGroup: {
      type: String,
      enum: ALL_BLOOD_GROUPS,
      required: true,
    },
    units: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Units cannot be negative."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound unique index: one entry per blood group per blood bank
inventorySchema.index({ bloodBankId: 1, bloodGroup: 1 }, { unique: true });

const Inventory =
  mongoose.models.Inventory ||
  mongoose.model<IInventoryEntryDocument>("Inventory", inventorySchema);

export default Inventory as InventoryModelType;
