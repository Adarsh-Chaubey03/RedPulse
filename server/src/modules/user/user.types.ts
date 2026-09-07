import type { Document, Model, Types } from "mongoose";

export type UserRole = "donor" | "patient" | "hospital" | "bloodBank" | "admin";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

// GeoJSON Point — coordinates are [longitude, latitude] per GeoJSON spec
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IUser {
  firebaseUid?: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  dateOfBirth?: Date;
  bloodGroup?: BloodGroup;
  location?: GeoPoint;
  // Organization fields — used by hospital and bloodBank roles
  organizationName?: string;
  phone?: string;
  address?: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = Document<unknown, object, IUser> &
  IUser & {
    _id: Types.ObjectId;
  };

export type UserModelType = Model<IUserDocument>;
