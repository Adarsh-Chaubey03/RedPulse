import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  getMyInventory,
  updateInventoryEntry,
  bulkUpdateInventory,
} from "./inventory.controller";

export const inventoryRoutes = (router: Router): void => {
  /**
   * GET /api/inventory
   * Blood-bank: get own full inventory (all 8 blood groups).
   */
  router.get("/api/inventory", authenticate, getMyInventory);

  /**
   * PUT /api/inventory
   * Blood-bank: bulk-update multiple blood group units.
   * Body: { inventory: [{ bloodGroup, units }] }
   */
  router.put("/api/inventory", authenticate, bulkUpdateInventory);

  /**
   * PUT /api/inventory/:bloodGroup
   * Blood-bank: set units for a single blood group.
   * Body: { units: number }
   */
  router.put("/api/inventory/:bloodGroup", authenticate, updateInventoryEntry);
};
