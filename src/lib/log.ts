import type { NextRequest } from "next/server";

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  msg: string;
  [key: string]: unknown;
}

export interface RequestLogEntry {
  request_id: string;
  method: string;
  route: string;
  status: number;
  duration_ms: number;
  source?: "web" | "worker";
  user_id?: string | null;
  role?: string | null;
  error_code?: string | null;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "pin",
  "token",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "password_hash",
  "pin_hash",
  "rawpassword",
  "currentpassword",
  "newpassword",
  "otp",
  "access_token",
  "refresh_token",
  "csrf",
  "csrf_token",
  "x-csrf-token",
  "api_key",
  "apikey",
  "private_key",
  "database_url",
  "dsn",
  "session_id",
  "passkey",
  "credential",
]);

const SAFE_REQUEST_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

function mintUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Strip CR/LF/TAB and ASCII control characters, and bound length to prevent log injection. */
export function sanitizeLogString(val: string, maxLen = 256): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = val.replace(/[\x00-\x1f\x7f]/g, " ").trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

/** Validate inbound X-Request-ID (length + safe charset) or mint a fresh UUID. */
export function sanitizeRequestId(raw: string | null | undefined): string {
  if (typeof raw === "string" && SAFE_REQUEST_ID_RE.test(raw)) {
    return raw;
  }
  return mintUuid();
}

export function isHealthOrMetricsPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/metrics") ||
    pathname === "/metrics"
  );
}

export function shouldLogHealthChecks(): boolean {
  return process.env.LOG_HEALTH_CHECKS === "1";
}

export function redactSensitive(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  if (typeof obj === "string") return sanitizeLogString(obj, 1024);
  if (typeof obj !== "object" || obj === null) return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redactSensitive(v);
  }
  return out;
}

/** Single-line structured JSON log so `docker logs ... | jq` and Loki can filter/group. */
function emit(level: Level, fields: Record<string, unknown>) {
  const sanitized = redactSensitive(fields) as Record<string, unknown>;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...sanitized });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

/** Emit the canonical U6 `http.request` structured JSON log event (once per request). */
export function logRequest(entry: RequestLogEntry): void {
  const rawRoute = entry.route.split("?")[0] || "/";
  const route = sanitizeLogString(rawRoute, 256);
  if (isHealthOrMetricsPath(route) && !shouldLogHealthChecks()) {
    return;
  }

  const status = Number.isFinite(entry.status) ? Math.trunc(entry.status) : 500;
  const level: Level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  const duration_ms = Math.max(0, Math.round(Number.isFinite(entry.duration_ms) ? entry.duration_ms : 0));

  const payload: Record<string, unknown> = {
    event: "http.request",
    request_id: sanitizeRequestId(entry.request_id),
    method: sanitizeLogString(entry.method || "GET", 16).toUpperCase(),
    route,
    status,
    duration_ms,
    source: entry.source ?? "web",
  };

  if (entry.user_id) {
    payload.user_id = sanitizeLogString(entry.user_id, 64);
  }
  if (entry.role) {
    payload.role = sanitizeLogString(entry.role, 64);
  }
  if (entry.error_code) {
    payload.error_code = sanitizeLogString(entry.error_code, 64);
  }

  emit(level, payload);
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

/** Read the correlation ID forwarded by src/middleware.ts, or mint a safe UUID if absent/invalid. */
export function getRequestId(req: NextRequest): string {
  return sanitizeRequestId(
    req.headers.get("x-request-id") ||
      req.headers.get("x-middleware-request-x-request-id")
  );
}
