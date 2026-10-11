import type { NextRequest } from "next/server";

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  msg: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "pin",
  "token",
  "secret",
  "authorization",
  "cookie",
  "password_hash",
  "pin_hash",
  "rawpassword",
  "currentpassword",
  "newpassword",
]);

export function redactSensitive(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  if (typeof obj !== "object" || obj === null) return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redactSensitive(v);
  }
  return out;
}

/** Single-line structured JSON log so `docker logs ... | jq` can filter/group. */
function emit(level: Level, fields: LogFields) {
  const sanitized = redactSensitive(fields) as LogFields;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...sanitized });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const log = {
  debug: (f: LogFields) => {
    if (process.env.LOG_LEVEL === "debug") emit("debug", f);
  },
  info: (f: LogFields) => emit("info", f),
  warn: (f: LogFields) => emit("warn", f),
  error: (f: LogFields) => emit("error", f),

  /** Wrap a route handler to auto-log entry, exit, duration, and errors, tagged with the request ID. */
  wrap: <T extends (req: NextRequest, ...args: any[]) => Promise<Response>>(route: string, handler: T): T =>
    (async (req: NextRequest, ...args: any[]) => {
      const requestId = getRequestId(req);
      const started = Date.now();
      log.info({ msg: "req.start", route, requestId, method: req.method });
      try {
        const res = await handler(req, ...args);
        log.info({ msg: "req.end", route, requestId, status: res.status, durMs: Date.now() - started });
        return res;
      } catch (err) {
        log.error({
          msg: "req.error",
          route,
          requestId,
          durMs: Date.now() - started,
          err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
        });
        throw err;
      }
    }) as T,
};

/** Read the correlation ID forwarded by src/middleware.ts, or mint one if absent. */
export function getRequestId(req: NextRequest): string {
  return (
    req.headers.get("x-request-id") ||
    req.headers.get("x-middleware-request-x-request-id") ||
    `gen-${Date.now().toString(36)}`
  );
}
