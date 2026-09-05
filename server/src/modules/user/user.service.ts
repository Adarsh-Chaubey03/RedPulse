import User from "./user.model";
import type { IUserDocument, UserRole, BloodGroup } from "./user.types";

// ─── Sanitize ─────────────────────────────────────────────────────────────────

export const sanitizeUser = (user: Partial<IUserDocument> | null): Record<string, unknown> | null => {
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
 * The backend always calculates this — the client never sets it directly.
 *
 * Base requirements (all roles): firstName, lastName, dateOfBirth, bloodGroup.
 * Donor-specific: bloodGroup is already in base requirements, so no extra fields yet.
 * This function is intentionally flexible for future role-specific expansion.
 */
export const calculateIsProfileComplete = (
  user: Partial<IUserDocument>,
): boolean => {
  const base =
    !!user.firstName?.trim() &&
    !!user.lastName?.trim() &&
    !!user.dateOfBirth &&
    !!user.bloodGroup;

  return base;
};

// ─── Profile update ───────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  dateOfBirth?: Date | string;
  bloodGroup?: BloodGroup;
}

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<IUserDocument | null> => {
  const user = await User.findById(userId);
  if (!user) return null;

  // Apply only the fields that were explicitly provided
  if (input.firstName !== undefined) user.firstName = input.firstName.trim();
  if (input.lastName !== undefined) user.lastName = input.lastName.trim();
  if (input.profilePhoto !== undefined) user.profilePhoto = input.profilePhoto;
  if (input.bloodGroup !== undefined) user.bloodGroup = input.bloodGroup;

  if (input.dateOfBirth !== undefined) {
    const parsed = new Date(input.dateOfBirth);
    if (isNaN(parsed.getTime())) {
      throw new Error("Invalid date of birth.");
    }
    // Must not be in the future
    if (parsed > new Date()) {
      throw new Error("Date of birth cannot be in the future.");
    }
    user.dateOfBirth = parsed;
  }

  // Recalculate profile completion — never trust a client-provided value
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
