import mongoose, { Schema } from "mongoose";
import type { IUserDocument, UserModelType } from "./user.types";

const geoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    firebaseUid: {
      type: String,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // already creates the index — no separate `index: true`
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["donor", "patient", "hospital", "bloodBank", "admin"],
      required: true,
      default: "patient",
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    location: {
      type: geoPointSchema,
      default: undefined,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    // Organization-specific fields (hospital / bloodBank roles)
    organizationName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// 2dsphere index required for $near / $geoWithin queries on donors
userSchema.index({ location: "2dsphere" });

// admin.service.listUsers: filter { role } + sort { createdAt: -1 }.
// The { role: 1 } prefix also serves the "$group by role" platform-stats
// aggregation, which previously had to scan the whole collection.
userSchema.index({ role: 1, createdAt: -1 });

// admin.service.getPendingVerificationUsers / the pendingVerification count:
//   filter { isVerified: false, role: { $ne: "admin" } } + sort { createdAt: -1 }
userSchema.index({ isVerified: 1, createdAt: -1 });

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const safeUser = ret as unknown as { [key: string]: unknown };
    delete safeUser.password;
    return safeUser;
  },
});

const User =
  mongoose.models.User || mongoose.model<IUserDocument>("User", userSchema);

export default User as UserModelType;
