import client from "prom-client";

// Collect default Node.js metrics (CPU, memory, event loop, GC, etc.)
client.collectDefaultMetrics();

// ── HTTP Metrics ──

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
});

export const httpActiveRequests = new client.Gauge({
  name: "http_active_requests",
  help: "Number of HTTP requests currently being processed",
});

// ── Auth Metrics ──

export const authAttemptsTotal = new client.Counter({
  name: "auth_attempts_total",
  help: "Total authentication attempts",
  labelNames: ["action", "result"] as const,
});

// ── Database Metrics ──

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "model"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

export const register = client.register;
