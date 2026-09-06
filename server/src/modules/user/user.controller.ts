import type { Request, Response } from "express";
import { z } from "zod";
import {
  sanitizeUser,
  updateUserProfile,
  updateDonorAvailability,
  updateUserLocation,
} from "./user.service";
import User from "./user.model";
import type { BloodGroup } from "./user.types";

// ─── Validation schemas ───────────────────────────────────────────────────────

const BLOOD_GROUP_VALUES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name cannot be empty.").optional(),
  lastName: z.string().trim().min(1, "Last name cannot be empty.").optional(),
  profilePhoto: z.string().url("Profile photo must be a valid URL.").optional(),
  dateOfBirth: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid date of birth." })
    .optional(),
  bloodGroup: z
    .string()
    .refine((v) => BLOOD_GROUP_VALUES.includes(v), { message: "Invalid blood group." })
    .optional(),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

const updateLocationSchema = z.object({
  latitude: z
    .number({ required_error: "latitude is required." })
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90, "Latitude must be between -90 and 90."),
  longitude: z
    .number({ required_error: "longitude is required." })
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
});

// ─── Shared auth guard ────────────────────────────────────────────────────────

const requireUserId = (req: Request, res: Response): string | null => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
      errors: ["Missing user context."],
    });
    return null;
  }
  return userId;
};

// ─── GET /api/users/me ────────────────────────────────────────────────────────

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found.", errors: ["No user found for the provided token."] });
      return;
    }

    res.status(200).json({ success: true, message: "Profile retrieved successfully.", data: sanitizeUser(user) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    res.status(500).json({ success: false, message: "Unable to retrieve profile.", errors: [message] });
  }
};

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Validation failed.", errors: parsed.error.issues.map((i) => i.message) });
      return;
    }

    const updated = await updateUserProfile(userId, {
      ...parsed.data,
      bloodGroup: parsed.data.bloodGroup as BloodGroup | undefined,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: "User not found.", errors: ["No user found for the provided token."] });
      return;
    }

    res.status(200).json({ success: true, message: "Profile updated successfully.", data: sanitizeUser(updated) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    const isValidation = message.includes("Invalid") || message.includes("cannot be");
    res.status(isValidation ? 400 : 500).json({ success: false, message: isValidation ? message : "Unable to update profile.", errors: [message] });
  }
};

// ─── PATCH /api/users/me/availability ────────────────────────────────────────

export const updateMyAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const parsed = updateAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Validation failed.", errors: parsed.error.issues.map((i) => i.message) });
      return;
    }

    const updated = await updateDonorAvailability(userId, parsed.data.isAvailable);
    if (!updated) {
      res.status(404).json({ success: false, message: "User not found.", errors: ["No user found for the provided token."] });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Availability set to ${parsed.data.isAvailable ? "available" : "unavailable"}.`,
      data: sanitizeUser(updated),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    const isForbidden = message.includes("only be set for donor");
    res.status(isForbidden ? 403 : 500).json({ success: false, message: isForbidden ? message : "Unable to update availability.", errors: [message] });
  }
};

// ─── PATCH /api/users/me/location ─────────────────────────────────────────────

export const updateMyLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Validation failed.", errors: parsed.error.issues.map((i) => i.message) });
      return;
    }

    const { latitude, longitude } = parsed.data;
    const updated = await updateUserLocation(userId, latitude, longitude);

    if (!updated) {
      res.status(404).json({ success: false, message: "User not found.", errors: ["No user found for the provided token."] });
      return;
    }

    res.status(200).json({ success: true, message: "Location updated successfully.", data: sanitizeUser(updated) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    res.status(500).json({ success: false, message: "Unable to update location.", errors: [message] });
  }
};
