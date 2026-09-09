import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "user.verify"
  | "user.reject"
  | "user.deactivate"
  | "user.reactivate"
  | "request.cancel"       // admin-initiated cancel
  | "request.status_change";

export interface IAuditLog {
  adminId:     Types.ObjectId;
  action:      AuditAction;
  targetType:  "user" | "blood_request";
  targetId:    Types.ObjectId;
  metadata?:   Record<string, unknown>;
  createdAt:   Date;
}

export type IAuditLogDocument = Document<unknown, object, IAuditLog> &
  IAuditLog & { _id: Types.ObjectId };

export type AuditLogModelType = Model<IAuditLogDocument>;

// ─── Schema ───────────────────────────────────────────────────────────────────

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "user.verify",
        "user.reject",
        "user.deactivate",
        "user.reactivate",
        "request.cancel",
        "request.status_change",
      ] satisfies AuditAction[],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["user", "blood_request"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // Arbitrary safe metadata — never store passwords/tokens here
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable records
    versionKey: false,
  },
);

// Compound index: efficient queries for "what did admin X do?" and "what happened to entity Y?"
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLogDocument>("AuditLog", auditLogSchema);

export default AuditLog as AuditLogModelType;
