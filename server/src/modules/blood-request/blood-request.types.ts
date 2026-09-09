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

export type DonorResponseStatus = "pending" | "accepted" | "withdrawn";

// ─── Valid status transitions (state machine) ─────────────────────────────────
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  searching:          ["partiallyFulfilled", "fulfilled", "expired", "cancelled"],
  partiallyFulfilled: ["fulfilled", "expired", "cancelled"],
  fulfilled:          [],
  expired:            [],
  cancelled:          [],
};

// ─── Embedded donor response ──────────────────────────────────────────────────

export interface IDonorResponse {
  donorId:      Types.ObjectId;
  donorName:    string;
  bloodGroup:   BloodGroup;
  status:       DonorResponseStatus;
  respondedAt:  Date;
  note?:        string;
}

export type IDonorResponseDocument = IDonorResponse & { _id: Types.ObjectId };

// ─── BloodRequest document ────────────────────────────────────────────────────

export interface IBloodRequest {
  requestedBy:           Types.ObjectId;
  patientName:           string;
  bloodGroup:            BloodGroup;
  bloodComponent:        BloodComponent;
  unitsRequired:         number;
  unitsFulfilled:        number;
  hospitalName:          string;
  hospitalLocation:      GeoPoint;
  requiredAt:            Date;
  /** When the request automatically expires (backend-enforced). */
  expiresAt:             Date;
  urgency:               Urgency;
  additionalInformation?: string;
  status:                RequestStatus;
  donorResponses:        IDonorResponseDocument[];
  createdAt:             Date;
  updatedAt:             Date;
}

export type IBloodRequestDocument = Document<unknown, object, IBloodRequest> &
  IBloodRequest & { _id: Types.ObjectId };

export type BloodRequestModelType = Model<IBloodRequestDocument>;
