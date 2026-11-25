import pino from "pino";

// model-runtime/logger.ts
// pino child logger for the AI layer. Reuses the project's redaction policy so
// no token/secret/authorization value ever reaches the log stream.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
    bindings: () => ({ service: "gate-monitor-ai" }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password", "token", "authorization", "cookie", "secret",
      "apiKey", "api_key", "clientSecret", "refreshToken",
      "*.password", "*.token", "*.pin",
    ],
    censor: "[REDACTED]",
  },
});

export function log(context: string) {
  return logger.child({ context });
}
