import type { Types } from "mongoose";
import RefreshToken from "./refreshToken.model";
import {
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "./auth.utils";

// ─── Session creation ─────────────────────────────────────────────────────────

/**
 * Create a new refresh-token session for a user.
 * Returns the raw token to be sent to the client exactly once via httpOnly cookie.
 * The raw value is NEVER stored — only its SHA-256 hash.
 */
export const createRefreshTokenSession = async (
  userId: Types.ObjectId | string,
): Promise<string> => {
  const { raw, hash } = generateRefreshToken();

  await RefreshToken.create({
    userId,
    tokenHash: hash,
    expiresAt: getRefreshTokenExpiry(),
    isRevoked: false,
  });

  return raw;
};

// ─── Token rotation ───────────────────────────────────────────────────────────

/**
 * Validate an incoming raw refresh token, revoke the current session,
 * and issue a new one.
 *
 * Returns the userId associated with the session plus the new raw token.
 * Throws on any invalid/expired/revoked token — callers should treat
 * any thrown error as an unauthenticated condition.
 */
export const rotateRefreshToken = async (
  rawToken: string,
): Promise<{ userId: string; newRawToken: string }> => {
  const hash = hashToken(rawToken);

  const session = await RefreshToken.findOne({ tokenHash: hash });

  if (!session) {
    throw new Error("Refresh token not found.");
  }

  if (session.isRevoked) {
    // Possible token reuse — revoke ALL sessions for this user as a precaution
    await RefreshToken.updateMany({ userId: session.userId }, { isRevoked: true });
    throw new Error("Refresh token has already been used or revoked.");
  }

  if (session.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: session._id });
    throw new Error("Refresh token has expired.");
  }

  // Revoke the current session
  session.isRevoked = true;
  await session.save();

  // Issue replacement session
  const { raw: newRawToken, hash: newHash } = generateRefreshToken();

  await RefreshToken.create({
    userId: session.userId,
    tokenHash: newHash,
    expiresAt: getRefreshTokenExpiry(),
    isRevoked: false,
  });

  return { userId: session.userId.toString(), newRawToken };
};

// ─── Logout / invalidation ────────────────────────────────────────────────────

/**
 * Revoke a specific refresh-token session identified by the raw token.
 * Silently succeeds if the token is not found (idempotent logout).
 */
export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  const hash = hashToken(rawToken);
  await RefreshToken.findOneAndUpdate({ tokenHash: hash }, { isRevoked: true });
};

/**
 * Revoke ALL active sessions for a user (e.g. "log out everywhere").
 */
export const revokeAllUserSessions = async (
  userId: Types.ObjectId | string,
): Promise<void> => {
  await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
};
