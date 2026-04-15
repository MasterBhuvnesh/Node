import type { Request, Response, NextFunction } from "express";
import { httpRequestDuration, httpRequestsTotal, httpActiveRequests } from "../config/metrics";

/** Normalize route paths so metrics don't explode with unique UUIDs */
function normalizePath(req: Request): string {
  const route = req.route?.path;
  if (route) return req.baseUrl + route;

  // Fallback: replace UUIDs with :id
  return req.path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id"
  );
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip the metrics endpoint itself
  if (req.path === "/metrics") return next();

  httpActiveRequests.inc();
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = normalizePath(req);
    const labels = { method: req.method, route, status_code: res.statusCode.toString() };

    end(labels);
    httpRequestsTotal.inc(labels);
    httpActiveRequests.dec();
  });

  next();
}
