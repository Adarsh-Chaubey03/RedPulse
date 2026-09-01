import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { authRoutes } from "./modules/auth/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.status(200).json({
    success: true,
    message: "RedPulse API is running",
    database: dbStatus,
  });
});

const router = express.Router();
authRoutes(router);
app.use(router);

export default app;