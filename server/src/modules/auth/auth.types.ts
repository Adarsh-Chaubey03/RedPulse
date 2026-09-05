import type { Document, Model, Types } from "mongoose";

// ─── Refresh Token Session ───────────────────────────────────────────────────

export interface IRefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;       // SHA-256 hash of the raw token — raw is never stored
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IRefreshTokenDocument = Document<unknown, object, IRefreshToken> &
  IRefreshToken & {
    _id: Types.ObjectId;
  };

export type RefreshTokenModelType = Model<IRefreshTokenDocument>;

// ─── Cookie Config ────────────────────────────────────────────────────────────

export interface RefreshCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
}
