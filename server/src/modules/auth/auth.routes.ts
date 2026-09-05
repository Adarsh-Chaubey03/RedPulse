import type { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { register, login, refresh, logout, me } from "./auth.controller";

export const authRoutes = (router: Router): void => {
  router.post("/api/auth/register", register);
  router.post("/api/auth/login", login);
  router.post("/api/auth/refresh", refresh);
  router.post("/api/auth/logout", logout);
  router.get("/api/auth/me", authenticate, me);
};
