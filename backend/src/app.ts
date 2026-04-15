import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import groupRoutes from "./modules/group/group.routes";
import memberRoutes from "./modules/member/member.routes";
import logRoutes from "./modules/logs/log.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/groups", memberRoutes);
app.use("/groups", logRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use(errorHandler);

export default app;
