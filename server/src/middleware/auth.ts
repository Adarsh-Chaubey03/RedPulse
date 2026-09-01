import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export interface AuthenticatedUser {
  userId: string;
  role: string;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
      errors: ["Missing Authorization header."],
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format.",
      errors: ["Expected format: Bearer <token>"],
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; role?: string };

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
        errors: ["JWT payload is missing required fields."],
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired.",
        errors: ["JWT has expired."],
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token.",
      errors: ["JWT verification failed."],
    });
  }
};
