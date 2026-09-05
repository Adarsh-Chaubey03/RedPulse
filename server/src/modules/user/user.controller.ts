import type { Request, Response } from "express";
import { z } from "zod";
import {
  sanitizeUser,
  updateUserProfile,
  updateDonorAvailability,
} from "./user.service";
import User from "./user.model";

// ─── Validation schemas ───────────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name cannot be empty.").optional(),
  lastName: z.string().trim().min(1, "Last name cannot be empty.").optional(),
  profilePhoto: z.string().url("Profile photo must be a valid URL.").optional(),
  dateOfBirth: z
    .string()
    .refine((v) => !isNaN(new Date(v).getTime()), {
      message: "Invalid date of birth.",
    })
    .optional(),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: "Invalid blood group." }),
  }).optional(),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean({ required_error: "isAvailable is required." }),
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: ["Missing user context."],
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
        errors: ["No user found for the provided token."],
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      data: sanitizeUser(user),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    res.status(500).json({
      success: false,
      message: "Unable to retrieve profile.",
      errors: [message],
    });
  }
};

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: ["Missing user context."],
      });
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const updated = await updateUserProfile(userId, parsed.data);

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "User not found.",
        errors: ["No user found for the provided token."],
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: sanitizeUser(updated),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    const isValidationError =
      message.includes("Invalid") || message.includes("cannot be");
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? message : "Unable to update profile.",
      errors: [message],
    });
  }
};

// ─── PATCH /api/users/me/availability ────────────────────────────────────────

export const updateMyAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: ["Missing user context."],
      });
      return;
    }

    const parsed = updateAvailabilitySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const updated = await updateDonorAvailability(userId, parsed.data.isAvailable);

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "User not found.",
        errors: ["No user found for the provided token."],
      });
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
    res.status(isForbidden ? 403 : 500).json({
      success: false,
      message: isForbidden ? message : "Unable to update availability.",
      errors: [message],
    });
  }
};
