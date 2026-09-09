/**
 * authorize — role-based access control middleware.
 *
 * Usage:
 *   router.get('/path', authenticate, authorize('admin'), handler)
 *   router.get('/path', authenticate, authorize('admin', 'hospital'), handler)
 *
 * Always apply AFTER authenticate so req.user is populated.
 * Role is read from the server-side JWT payload — never trusted from the client.
 */

import type { NextFunction, Request, Response } from "express";

export const authorize = (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;

    if (!role) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
        errors: ["Missing user context."],
      });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        success: false,
        message: "Access denied.",
        errors: [
          `Role '${role}' is not permitted to access this resource.`,
        ],
      });
      return;
    }

    next();
  };
