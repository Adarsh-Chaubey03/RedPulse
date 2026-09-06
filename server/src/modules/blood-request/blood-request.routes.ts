import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  createRequest,
  listRequests,
  getRequest,
  updateStatus,
  cancelRequest,
} from "./blood-request.controller";

export const bloodRequestRoutes = (router: Router): void => {
  router.post("/api/blood-requests",               authenticate, createRequest);
  router.get("/api/blood-requests",                authenticate, listRequests);
  router.get("/api/blood-requests/:id",            authenticate, getRequest);
  router.patch("/api/blood-requests/:id/status",   authenticate, updateStatus);
  router.post("/api/blood-requests/:id/cancel",    authenticate, cancelRequest);
};
