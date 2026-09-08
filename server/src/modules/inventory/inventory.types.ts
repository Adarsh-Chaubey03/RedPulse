import type { Document, Model, Types } from "mongoose";

export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export const ALL_BLOOD_GROUPS: readonly BloodGroup[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
];

export interface IInventoryEntry {
  bloodBankId: Types.ObjectId;   // references User with role=bloodBank
  bloodGroup:  BloodGroup;
  units:       number;           // must be >= 0
  createdAt:   Date;
  updatedAt:   Date;
}

export type IInventoryEntryDocument = Document<unknown, object, IInventoryEntry> &
  IInventoryEntry & { _id: Types.ObjectId };

export type InventoryModelType = Model<IInventoryEntryDocument>;
