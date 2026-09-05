import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import User from "../user/user.model";
import { sanitizeUser } from "../user/user.service";
import {
  generateAccessToken,
  getRefreshCookieMaxAge,
} from "./auth.utils";
import {
  createRefreshTokenSession,
  rotateRefreshToken,
  revokeRefreshToken,
} from "./auth.service";

// ─── Validation schemas ───────────────────────────────────────────────────────

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

// ─── Cookie helper ────────────────────────────────────────────────────────────

const REFRESH_COOKIE_NAME = "rp_refresh_token";

const setRefreshCookie = (res: Response, rawToken: string): void => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",          // cookie only sent to auth routes
    maxAge: getRefreshCookieMaxAge(),
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/api/auth",
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const { email, password, firstName, lastName, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
        errors: ["Email already registered."],
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: sanitizeUser(user),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    res.status(500).json({
      success: false,
      message: "Unable to register user.",
      errors: [message],
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        errors: ["Authentication failed."],
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        errors: ["Authentication failed."],
      });
      return;
    }

    const accessToken = generateAccessToken(user);
    const rawRefreshToken = await createRefreshTokenSession(user._id);

    setRefreshCookie(res, rawRefreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    res.status(500).json({
      success: false,
      message: "Unable to log in.",
      errors: [message],
    });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!rawToken) {
      res.status(401).json({
        success: false,
        message: "No refresh token provided.",
        errors: ["Missing refresh token cookie."],
      });
      return;
    }

    let userId: string;
    let newRawToken: string;

    try {
      ({ userId, newRawToken } = await rotateRefreshToken(rawToken));
    } catch (err: unknown) {
      clearRefreshCookie(res);
      const message = err instanceof Error ? err.message : "Invalid refresh token.";
      res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        errors: [message],
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      clearRefreshCookie(res);
      res.status(401).json({
        success: false,
        message: "User not found.",
        errors: ["Account associated with this session no longer exists."],
      });
      return;
    }

    const accessToken = generateAccessToken(user);

    setRefreshCookie(res, newRawToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(500).json({
      success: false,
      message: "Unable to refresh token.",
      errors: [message],
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];

    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }

    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
      data: null,
    });
  } catch (error: unknown) {
    // Even on error, clear the cookie so the client is unauthenticated
    clearRefreshCookie(res);
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(500).json({
      success: false,
      message: "Logout encountered an error.",
      errors: [message],
    });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: ["User not found in request context."],
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
      message: "Current user retrieved successfully.",
      data: sanitizeUser(user),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error.";
    res.status(500).json({
      success: false,
      message: "Unable to retrieve current user.",
      errors: [message],
    });
  }
};
