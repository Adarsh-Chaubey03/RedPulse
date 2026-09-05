import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { IUserDocument } from "../user/user.types";

// ─── Env validation ───────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

if (!JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: string;
}

// ─── Access token ─────────────────────────────────────────────────────────────

export const generateAccessToken = (user: Pick<IUserDocument, "_id" | "role">): string => {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const expiresIn = (process.env.JWT_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, JWT_SECRET!, { expiresIn });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload;
};

// ─── Refresh token ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure opaque refresh token.
 * Returns the raw token (sent to client once via httpOnly cookie) and its
 * SHA-256 hash (stored in MongoDB — raw value is never persisted).
 */
export const generateRefreshToken = (): { raw: string; hash: string } => {
  const raw = crypto.randomBytes(64).toString("hex"); // 128-char hex string
  const hash = hashToken(raw);
  return { raw, hash };
};

/** SHA-256 hash a raw token for safe storage / comparison. */
export const hashToken = (raw: string): string => {
  return crypto.createHash("sha256").update(raw).digest("hex");
};

/** Parse the refresh token TTL env var into a JS Date offset. */
export const getRefreshTokenExpiry = (): Date => {
  const ttlStr = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const match = ttlStr.match(/^(\d+)([smhd])$/);

  if (!match) {
    // Default to 7 days if format is unexpected
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * multipliers[unit]);
};

/** Cookie maxAge in milliseconds derived from the same TTL env var. */
export const getRefreshCookieMaxAge = (): number => {
  const expiry = getRefreshTokenExpiry();
  return expiry.getTime() - Date.now();
};
