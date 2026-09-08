import type { Request, Response } from "express";
import {
  getInventory,
  upsertInventoryEntry,
  bulkUpsertInventory,
} from "./inventory.service";
import {
  updateInventoryEntrySchema,
  bulkUpdateInventorySchema,
} from "./inventory.validation";
import type { BloodGroup } from "./inventory.types";

// ─── Auth + role guard ────────────────────────────────────────────────────────
const requireBloodBank = (
  req: Request,
  res: Response,
): { userId: string; role: string } | null => {
  const userId = req.user?.userId;
  const role   = req.user?.role;
  if (!userId || !role) {
    res.status(401).json({ success: false, message: "Authentication required.", errors: ["Missing user context."] });
    return null;
  }
  if (role !== "bloodBank" && role !== "admin") {
    res.status(403).json({ success: false, message: "Blood bank access required.", errors: ["Role must be bloodBank or admin."] });
    return null;
  }
  return { userId, role };
};

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Returns the authenticated blood bank's full inventory (all 8 blood groups).

export const getMyInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireBloodBank(req, res);
    if (!auth) return;

    const startMs = Date.now();
    const entries = await getInventory(auth.userId);
    const queryMs = Date.now() - startMs;

    res.status(200).json({
      success: true,
      message: "Inventory retrieved successfully.",
      data: { inventory: entries, queryMs },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    const e = error as { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, message, errors: [message] });
  }
};

// ─── PUT /api/inventory/:bloodGroup ──────────────────────────────────────────
// Set the number of units for a specific blood group.

export const updateInventoryEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireBloodBank(req, res);
    if (!auth) return;

    const parsed = updateInventoryEntrySchema.safeParse({
      bloodGroup: req.params.bloodGroup,
      units:      req.body.units,
    });

    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Validation failed.", errors: parsed.error.issues.map((i) => i.message) });
      return;
    }

    const entry = await upsertInventoryEntry({
      bloodBankId: auth.userId,
      bloodGroup:  parsed.data.bloodGroup as BloodGroup,
      units:       parsed.data.units,
    });

    res.status(200).json({ success: true, message: "Inventory updated successfully.", data: entry });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    const e = error as { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, message, errors: [message] });
  }
};

// ─── PUT /api/inventory ───────────────────────────────────────────────────────
// Bulk-set multiple blood group units at once.

export const bulkUpdateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = requireBloodBank(req, res);
    if (!auth) return;

    const parsed = bulkUpdateInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Validation failed.", errors: parsed.error.issues.map((i) => i.message) });
      return;
    }

    const entries = await bulkUpsertInventory({
      bloodBankId: auth.userId,
      inventory:   parsed.data.inventory as Array<{ bloodGroup: BloodGroup; units: number }>,
    });

    res.status(200).json({ success: true, message: "Inventory updated successfully.", data: { inventory: entries } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error.";
    const e = error as { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ success: false, message, errors: [message] });
  }
};
