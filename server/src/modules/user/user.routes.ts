import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  getMyProfile,
  updateMyProfile,
  updateMyAvailability,
  updateMyLocation,
} from "./user.controller";

export const userRoutes = (router: Router): void => {
  router.get("/api/users/me", authenticate, getMyProfile);
  router.patch("/api/users/me", authenticate, updateMyProfile);
  router.patch("/api/users/me/availability", authenticate, updateMyAvailability);
  router.patch("/api/users/me/location", authenticate, updateMyLocation);
};
