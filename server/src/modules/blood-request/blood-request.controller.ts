import type { Request, Response } from "express";
import {
  createBloodRequestSchema,
  updateStatusSchema,
  listQuerySchema,
} from "./blood-request.validation";
import {
  createBloodRequest,
  listBloodRequests,
  getBloodRequestById,
  updateBloodRequestStatus,
  cancelBloodRequest,
} from "./blood-request.service";
import type { RequestStatus } from "./blood-request.types";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const requireUser = (
  req: Request,
  res: Response,
): { userId: string; role: string } | null => {
  const userId = req.user?.userId;
  const role = req.user?.role;
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

// ─── POST /api/blood-requests ─────────────────────────────────────────────────

export const createRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    // Donors cannot create emergency requests
    if (auth.role === "donor") {
      res.status(403).json({
        success: false,
        message: "Donors cannot create blood requests.",
        errors: ["Role 'donor' is not permitted for this action."],
      });
      return;
    }

    const parsed = createBloodRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const doc = await createBloodRequest(auth.userId, parsed.data);

    res.status(201).json({
      success: true,
      message: "Blood request created successfully.",
      data: doc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(500).json({ success: false, message: "Unable to create blood request.", errors: [message] });
  }
};

// ─── GET /api/blood-requests ──────────────────────────────────────────────────

export const listRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const result = await listBloodRequests(parsed.data);

    res.status(200).json({
      success: true,
      message: "Blood requests retrieved successfully.",
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(500).json({ success: false, message: "Unable to list blood requests.", errors: [message] });
  }
};

// ─── GET /api/blood-requests/:id ──────────────────────────────────────────────

export const getRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    const { id } = req.params;
    const doc = await getBloodRequestById(String(id));

    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Blood request not found.",
        errors: ["No request found for the given ID."],
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Blood request retrieved successfully.",
      data: doc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    res.status(500).json({ success: false, message: "Unable to retrieve blood request.", errors: [message] });
  }
};

// ─── PATCH /api/blood-requests/:id/status ─────────────────────────────────────

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const doc = await updateBloodRequestStatus(
      String(req.params.id),
      auth.userId,
      parsed.data.status as RequestStatus,
      auth.role,
    );

    res.status(200).json({
      success: true,
      message: "Status updated successfully.",
      data: doc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    const isAuth  = message.includes("authorised");
    const isLogic = message.includes("transition") || message.includes("Invalid");
    const isNotFound = message.includes("not found");
    const status = isAuth ? 403 : isLogic || isNotFound ? 400 : 500;
    res.status(status).json({ success: false, message, errors: [message] });
  }
};

// ─── POST /api/blood-requests/:id/cancel ──────────────────────────────────────

export const cancelRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;

    const doc = await cancelBloodRequest(String(req.params.id), auth.userId, auth.role);

    res.status(200).json({
      success: true,
      message: "Blood request cancelled successfully.",
      data: doc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    const isAuth     = message.includes("authorised");
    const isLogic    = message.includes("Cannot cancel") || message.includes("Invalid");
    const isNotFound = message.includes("not found");
    const status = isAuth ? 403 : isLogic || isNotFound ? 400 : 500;
    res.status(status).json({ success: false, message, errors: [message] });
  }
};
