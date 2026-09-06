import type { Document, Model, Types } from "mongoose";
import type { GeoPoint } from "../user/user.types";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type BloodComponent =
  | "Whole Blood"
  | "Red Blood Cells"
  | "Plasma"
  | "Platelets";

export type Urgency = "critical" | "urgent" | "normal";

export type RequestStatus =
  | "searching"
  | "partiallyFulfilled"
  | "fulfilled"
  | "expired"
  | "cancelled";

// ─── Valid status transitions (state machine) ─────────────────────────────────
// Key = current status → Value = allowed next statuses
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  searching:          ["partiallyFulfilled", "fulfilled", "expired", "cancelled"],
  partiallyFulfilled: ["fulfilled", "expired", "cancelled"],
  fulfilled:          [],   // terminal
  expired:            [],   // terminal
  cancelled:          [],   // terminal
};

// ─── Document interface ───────────────────────────────────────────────────────

export interface IBloodRequest {
  requestedBy: Types.ObjectId;
  patientName: string;
  bloodGroup: BloodGroup;
  bloodComponent: BloodComponent;
  unitsRequired: number;
  hospitalName: string;
  hospitalLocation: GeoPoint;
  requiredAt: Date;
  urgency: Urgency;
  additionalInformation?: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type IBloodRequestDocument = Document<unknown, object, IBloodRequest> &
  IBloodRequest & { _id: Types.ObjectId };

export type BloodRequestModelType = Model<IBloodRequestDocument>;
