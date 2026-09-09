import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { authRoutes } from "./modules/auth/auth.routes";
import { userRoutes } from "./modules/user/user.routes";
import { bloodRequestRoutes } from "./modules/blood-request/blood-request.routes";
import { donorRoutes } from "./modules/donor/donor.routes";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import { adminRoutes } from "./modules/admin/admin.routes";

const app = express();

// ─── CORS — must come before other middleware ─────────────────────────────────
// Allow credentials so the browser sends the httpOnly refresh-token cookie
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

// ─── Body + cookie parsing ────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    success: true,
    message: "RedPulse API is running",
    database: dbStatus,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const router = express.Router();
authRoutes(router);
userRoutes(router);
bloodRequestRoutes(router);
donorRoutes(router);
inventoryRoutes(router);
adminRoutes(router);
app.use(router);

export default app;
