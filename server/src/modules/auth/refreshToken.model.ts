import mongoose, { Schema } from "mongoose";
import type { IRefreshTokenDocument, RefreshTokenModelType } from "./auth.types";

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL — auto-deletes expired documents
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const RefreshToken =
  mongoose.models.RefreshToken ||
  mongoose.model<IRefreshTokenDocument>("RefreshToken", refreshTokenSchema);

export default RefreshToken as RefreshTokenModelType;
