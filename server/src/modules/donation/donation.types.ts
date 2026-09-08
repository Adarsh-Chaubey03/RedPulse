import type { Document, Model, Types } from "mongoose";

/**
 * A DonationHistory record represents a CONFIRMED donation event.
 *
 * IMPORTANT: A donor response to a blood request does NOT automatically
 * create a donation record. A donation is only recorded when a separate
 * explicit confirmation workflow marks it as completed.
 *
 * This model stores the confirmed donation facts — not medical records.
 */

export type DonationStatus = "pending" | "completed" | "cancelled";

export interface IDonationHistory {
  donorId:          Types.ObjectId;
  bloodGroup:       string;
  donationDate:     Date;
  organizationName?: string;     // blood bank / hospital name
  relatedRequestId?: Types.ObjectId; // optional link to a BloodRequest
  status:           DonationStatus;
  notes?:           string;
  createdAt:        Date;
  updatedAt:        Date;
}

export type IDonationHistoryDocument = Document<unknown, object, IDonationHistory> &
  IDonationHistory & { _id: Types.ObjectId };

export type DonationHistoryModelType = Model<IDonationHistoryDocument>;
