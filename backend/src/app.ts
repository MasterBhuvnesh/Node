import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error.middleware";
import { metricsMiddleware } from "./middleware/metrics.middleware";
import { register } from "./config/metrics";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import groupRoutes from "./modules/group/group.routes";
import memberRoutes from "./modules/member/member.routes";
import logRoutes from "./modules/logs/log.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(metricsMiddleware);

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

// Prometheus metrics endpoint
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Error handler
app.use(errorHandler);

export default app;
