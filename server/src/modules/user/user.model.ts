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
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 2dsphere index required for $near / $geoWithin queries on donors
userSchema.index({ location: "2dsphere" });

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
