import mongoose, { Schema } from "mongoose";
import type { IUserDocument, UserModelType } from "./user.types";

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
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
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

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const safeUser = ret as unknown as { [key: string]: unknown };
    delete safeUser.password;
    return safeUser;
  },
});

const User = mongoose.models.User || mongoose.model<IUserDocument>("User", userSchema);

export default User as UserModelType;
