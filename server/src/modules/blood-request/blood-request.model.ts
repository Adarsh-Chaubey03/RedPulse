import mongoose, { Schema } from "mongoose";
import type { IBloodRequestDocument, BloodRequestModelType } from "./blood-request.types";

const geoPointSchema = new Schema(
  {
    type:        { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  { _id: false },
);

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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 2dsphere index for future nearby-donor queries
bloodRequestSchema.index({ hospitalLocation: "2dsphere" });

const BloodRequest =
  mongoose.models.BloodRequest ||
  mongoose.model<IBloodRequestDocument>("BloodRequest", bloodRequestSchema);

export default BloodRequest as BloodRequestModelType;
