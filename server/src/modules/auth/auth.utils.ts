import jwt from "jsonwebtoken";
import type { IUserDocument } from "../user/user.types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export interface JwtPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (user: Pick<IUserDocument, "_id" | "role">) => {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const expiresIn = (process.env.JWT_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
