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
      index: true,
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
      index: true,
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

// 2dsphere index for geospatial queries on hospital location
bloodRequestSchema.index({ hospitalLocation: "2dsphere" });

// Compound sparse unique index: one response per donor per request.
// Using sparse so documents without responses are not indexed.
bloodRequestSchema.index(
  { _id: 1, "donorResponses.donorId": 1 },
  { unique: false }, // uniqueness enforced in service with $elemMatch check
);

// ─── Model ────────────────────────────────────────────────────────────────────
const BloodRequest =
  mongoose.models.BloodRequest ||
  mongoose.model<IBloodRequestDocument>("BloodRequest", bloodRequestSchema);

export default BloodRequest as BloodRequestModelType;
