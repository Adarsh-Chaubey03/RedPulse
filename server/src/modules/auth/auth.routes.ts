import type { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import User from "../user/user.model";
import { generateAccessToken } from "./auth.utils";
import { sanitizeUser } from "../user/user.service";
import { authenticate } from "../../middleware/auth";

const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  role: z.enum(["donor", "patient", "hospital", "bloodBank"]),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const authRoutes = (router: Router) => {
  router.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errors: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const { email, password, firstName, lastName, role } = parsed.data;

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists.",
          errors: ["Email already registered."],
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      });

      const safeUser = sanitizeUser(user);

      return res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: safeUser,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Unable to register user.",
        errors: [error?.message || "Database error."],
      });
    }
  });

  router.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errors: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail }).select("+password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
          errors: ["Authentication failed."],
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
          errors: ["Authentication failed."],
        });
      }

      const accessToken = generateAccessToken(user);
      const safeUser = sanitizeUser(user);

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
          accessToken,
          user: safeUser,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Unable to log in.",
        errors: [error?.message || "Database error."],
      });
    }
  });

  router.get("/api/auth/me", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
          errors: ["User not found in request context."],
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
          errors: ["No user found for the provided token."],
        });
      }

      return res.status(200).json({
        success: true,
        message: "Current user retrieved successfully.",
        data: sanitizeUser(user),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Unable to retrieve current user.",
        errors: [error?.message || "Database error."],
      });
    }
  });

  router.post("/api/auth/logout", (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
      data: null,
    });
  });
};
