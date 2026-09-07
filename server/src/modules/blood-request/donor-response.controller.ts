/**
 * Donor-response controller — thin. All logic in donor-response.service.ts.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import {
  respondToBloodRequest,
  discoverRequestsForDonor,
  getResponsesForRequest,
} from "./donor-response.service";

// ─── Shared auth guard (mirrors existing pattern) ────────────────────────────
const requireUser = (
  req: Request,
  res: Response,
): { userId: string; role: string } | null => {
  const userId = req.user?.userId;
  const role   = req.user?.role;
  if (!userId || !role) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
      errors: ["Missing user context."],
    });
    return null;
  }
  return { userId, role };
};

// ─── Error → HTTP status helper ───────────────────────────────────────────────
const httpStatus = (err: unknown): number => {
  const e = err as { statusCode?: number; message?: string };
  if (e.statusCode) return e.statusCode;
  const msg = e.message ?? "";
  if (msg.includes("not found"))          return 404;
  if (msg.includes("authorised"))         return 403;
  if (msg.includes("already responded") ||
      msg.includes("status"))             return 409;
  if (msg.includes("not compatible") ||
      msg.includes("not a donor") ||
      msg.includes("not currently") ||
      msg.includes("Invalid"))            return 400;
  return 500;
};

// ─── GET /api/blood-requests/discover ────────────────────────────────────────
// Donor discovers blood requests that are compatible with their blood group.

const discoverQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const discoverRequests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    if (auth.role !== "donor") {
      res.status(403).json({
        success: false,
        message: "Only donors can discover blood requests.",
        errors: ["Role must be 'donor'."],
      });
      return;
    }

    const parsed = discoverQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const result = await discoverRequestsForDonor({
      donorId: auth.userId,
      page:    parsed.data.page,
      limit:   parsed.data.limit,
    });

    res.status(200).json({
      success: true,
      message: `Found ${result.meta.total} compatible request(s).`,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(httpStatus(error)).json({
      success: false,
      message,
      errors: [message],
    });
  }
};

// ─── POST /api/blood-requests/:id/respond ────────────────────────────────────
// Authenticated donor responds to a blood request.

const respondBodySchema = z.object({
  note: z.string().trim().max(500, "Note cannot exceed 500 characters.").optional(),
});

export const respondToRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    // Only donors may respond
    if (auth.role !== "donor") {
      res.status(403).json({
        success: false,
        message: "Only donors can respond to blood requests.",
        errors: ["Role must be 'donor'."],
      });
      return;
    }

    const requestId = String(req.params.id);

    const parsed = respondBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const result = await respondToBloodRequest({
      donorId:   auth.userId,
      requestId,
      note:      parsed.data.note,
    });

    res.status(200).json({
      success: true,
      message: `Response recorded. Request is now '${result.newStatus}'.`,
      data: {
        requestId,
        newStatus:      result.newStatus,
        unitsFulfilled: result.unitsFulfilled,
        unitsRequired:  result.request.unitsRequired,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(httpStatus(error)).json({
      success: false,
      message,
      errors: [message],
    });
  }
};

// ─── GET /api/blood-requests/:id/responses ────────────────────────────────────
// Owner / admin / hospital views donor responses for a specific request.

export const getRequestResponses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    const requestId = String(req.params.id);

    const doc = await getResponsesForRequest(requestId, auth.userId, auth.role);

    res.status(200).json({
      success: true,
      message: "Donor responses retrieved successfully.",
      data: doc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(httpStatus(error)).json({
      success: false,
      message,
      errors: [message],
    });
  }
};
