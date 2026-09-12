import User from "./user.model";
import type { IUserDocument, UserRole, BloodGroup, GeoPoint } from "./user.types";

// ─── Sanitize ─────────────────────────────────────────────────────────────────

export const sanitizeUser = (
  user: Partial<IUserDocument> | null,
): Record<string, unknown> | null => {
  if (!user) return null;
  const safeUser: Record<string, unknown> = user.toObject
    ? (user.toObject() as unknown as Record<string, unknown>)
    : { ...(user as unknown as Record<string, unknown>) };
  delete safeUser.password;
  return safeUser;
};

// ─── Reads ────────────────────────────────────────────────────────────────────

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email }).select("+password");
};

export const findUserById = async (userId: string) => {
  return User.findById(userId);
};

// ─── Profile completion ───────────────────────────────────────────────────────

/**
 * Determine whether a user's profile is considered complete.
 * Backend always calculates this — client never sets it directly.
 */
export const calculateIsProfileComplete = (
  user: Partial<IUserDocument>,
): boolean => {
  const role = user.role;
  if (role === "hospital" || role === "bloodBank") {
    return (
      !!user.organizationName?.trim() &&
      !!user.phone?.trim() &&
      !!user.address?.trim()
    );
  }
  if (role === "admin") {
    return !!user.firstName?.trim() && !!user.lastName?.trim();
  }
  // donor / patient
  return (
    !!user.firstName?.trim() &&
    !!user.lastName?.trim() &&
    !!user.dateOfBirth &&
    !!user.bloodGroup
  );
};

// ─── Profile update ───────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  dateOfBirth?: Date | string;
  bloodGroup?: BloodGroup;
  // Organization fields (hospital / bloodBank)
  organizationName?: string;
  phone?: string;
  address?: string;
}

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<IUserDocument | null> => {
  const user = await User.findById(userId);
  if (!user) return null;

  if (input.firstName !== undefined) user.firstName = input.firstName.trim();
  if (input.lastName !== undefined) user.lastName = input.lastName.trim();
  if (input.profilePhoto !== undefined) user.profilePhoto = input.profilePhoto;
  if (input.bloodGroup !== undefined) user.bloodGroup = input.bloodGroup;
  // Organization fields
  if (input.organizationName !== undefined) user.organizationName = input.organizationName.trim();
  if (input.phone !== undefined) user.phone = input.phone.trim();
  if (input.address !== undefined) user.address = input.address.trim();

  if (input.dateOfBirth !== undefined) {
    const parsed = new Date(input.dateOfBirth);
    if (isNaN(parsed.getTime())) throw new Error("Invalid date of birth.");
    if (parsed > new Date()) throw new Error("Date of birth cannot be in the future.");
    user.dateOfBirth = parsed;
  }

  user.isProfileComplete = calculateIsProfileComplete(user);
  await user.save();
  return user;
};

// ─── Donor availability ───────────────────────────────────────────────────────

export const updateDonorAvailability = async (
  userId: string,
  isAvailable: boolean,
): Promise<IUserDocument | null> => {
  const user = await User.findById(userId);
  if (!user) return null;

  if (user.role !== "donor") {
    throw new Error("Availability can only be set for donor accounts.");
  }

  user.isAvailable = isAvailable;
  await user.save();
  return user;
};

// ─── Location ─────────────────────────────────────────────────────────────────

export const updateUserLocation = async (
  userId: string,
  latitude: number,
  longitude: number,
): Promise<IUserDocument | null> => {
  const location: GeoPoint = {
    type: "Point",
    coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
  };

  // Single atomic write instead of findById + save. Nothing here depends on the
  // pre-update document, and runValidators keeps the GeoPoint sub-schema checks.
  // Returns null for an unknown user, exactly as the read-then-save did.
  return User.findByIdAndUpdate(
    userId,
    { $set: { location } },
    { new: true, runValidators: true },
  );
};

// ─── Legacy helpers (used by auth module) ────────────────────────────────────

export const createUser = async (input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}): Promise<Record<string, unknown> | null> => {
  const user = await User.create({ ...input });
  return sanitizeUser(user);
};
