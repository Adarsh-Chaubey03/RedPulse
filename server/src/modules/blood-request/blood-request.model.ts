import mongoose, { Schema } from "mongoose";
import type {
  IBloodRequestDocument,
  BloodRequestModelType,
} from "./blood-request.types";

// ─── GeoPoint sub-schema (reused for hospitalLocation) ───────────────────────
const geoPointSchema = new Schema(
  {
    type:        { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  { _id: false },
);

// ─── Embedded donor-response sub-schema ──────────────────────────────────────
const donorResponseSchema = new Schema(
  {
    donorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    donorName: {
      type: String,
      required: true,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "withdrawn"],
      required: true,
      default: "pending",
    },
    respondedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,        // keep subdoc _id for referencing individual responses
    versionKey: false,
  },
);

// ─── BloodRequest schema ──────────────────────────────────────────────────────
const bloodRequestSchema = new Schema<IBloodRequestDocument>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Indexed via the { requestedBy, urgency, createdAt } compound below.
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
      index: true,
    },
    bloodComponent: {
      type: String,
      enum: ["Whole Blood", "Red Blood Cells", "Plasma", "Platelets"],
      required: true,
    },
    unitsRequired: {
      type: Number,
      required: true,
      min: [1, "Units required must be at least 1."],
    },
    // Tracks how many units have been accepted so far
    unitsFulfilled: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Units fulfilled cannot be negative."],
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    hospitalLocation: {
      type: geoPointSchema,
      required: true,
    },
    requiredAt: {
      type: Date,
      required: true,
    },
    /**
     * Hard expiration time — backend-enforced.
     * Defaults to 48 hours after creation if not supplied.
     * Urgency-based defaults applied in the service layer.
     */
    expiresAt: {
      type: Date,
      required: true,
      // Indexed via the { status, expiresAt } compound below — the expiration
      // worker and the discover query both filter on status as well.
    },
    urgency: {
      type: String,
      enum: ["critical", "urgent", "normal"],
      required: true,
      default: "normal",
      index: true,
    },
    additionalInformation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["searching", "partiallyFulfilled", "fulfilled", "expired", "cancelled"],
      required: true,
      default: "searching",
      // Indexed via the { status, ... } compounds below.
    },
    // Embedded array of donor responses
    donorResponses: {
      type: [donorResponseSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
//
// Each compound index below is justified by a real query in the service layer;
// single-field indexes that are a strict prefix of one of them were removed so
// writes don't pay for duplicate b-trees.

// 2dsphere index for geospatial queries on hospital location
bloodRequestSchema.index({ hospitalLocation: "2dsphere" });

// expiration.worker.ts runs every 60s:
//   { status: { $in: ACTIVE }, expiresAt: { $lte: now } }
// Also serves the expiry guard in discoverRequestsForDonor ({ status, expiresAt }).
// Replaces the former standalone `expiresAt` index — expiresAt is never queried
// without status.
bloodRequestSchema.index({ status: 1, expiresAt: 1 });

// blood-request.service.listBloodRequests:
//   filter { status } + sort { urgency: 1, createdAt: -1 }
// Serves filter and sort from the index instead of an in-memory SORT stage.
// The { status: 1 } prefix also covers status-only filters and the
// "$group by status" platform-stats aggregation.
bloodRequestSchema.index({ status: 1, urgency: 1, createdAt: -1 });

// listBloodRequests when scoped to one requester ("my requests"):
//   filter { requestedBy } + sort { urgency: 1, createdAt: -1 }
// The { requestedBy: 1 } prefix replaces the former standalone index.
bloodRequestSchema.index({ requestedBy: 1, urgency: 1, createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────
const BloodRequest =
  mongoose.models.BloodRequest ||
  mongoose.model<IBloodRequestDocument>("BloodRequest", bloodRequestSchema);

export default BloodRequest as BloodRequestModelType;
