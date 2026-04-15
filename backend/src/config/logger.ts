import winston from "winston";
import LokiTransport from "winston-loki";
import { env } from "./env";

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

// File transports in production
if (env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" })
  );
}

// Loki transport when LOKI_URL is set (Docker environment)
if (process.env.LOKI_URL) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_URL,
      labels: { service: "node-backend" },
      json: true,
      format: winston.format.json(),
      onConnectionError: (err) => console.error("Loki connection error:", err),
    })
  );
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
});

export default logger;
