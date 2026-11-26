import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock postgres so metricsMiddleware / rate-limit never hit a real DB
vi.mock("@/lib/postgres", () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  poolQuery: vi.fn().mockResolvedValue({ rows: [{ count: 1, reset_at: new Date(Date.now() + 60_000).toISOString() }] }),
}));

import {
  log,
  logRequest,
  redactSensitive,
  sanitizeLogString,
  sanitizeRequestId,
  getRequestId,
} from "@/lib/log";
import { metricsMiddleware } from "@/middleware/metrics";
import { withRateLimit } from "@/lib/rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error-handler";

function makeReq(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): NextRequest {
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body,
  });
}

describe("U6 — Structured JSON Request Logging", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let captured: Array<{ stream: "stdout" | "stderr"; line: string; json: Record<string, unknown> }>;

  beforeEach(() => {
    captured = [];
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      const str = String(chunk).trim();
      if (str) {
        for (const line of str.split("\n")) {
          try {
            captured.push({ stream: "stdout", line, json: JSON.parse(line) });
          } catch {
            // ignore non-JSON
          }
        }
      }
      return true;
    });
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      const str = String(chunk).trim();
      if (str) {
        for (const line of str.split("\n")) {
          try {
            captured.push({ stream: "stderr", line, json: JSON.parse(line) });
          } catch {
            // ignore non-JSON
          }
        }
      }
      return true;
    });
    delete process.env.LOG_HEALTH_CHECKS;
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  const httpEvents = () => captured.filter((c) => c.json.event === "http.request");

  it("1. logs successful 200 request as single http.request JSON line on stdout", async () => {
    const req = makeReq("http://localhost/api/student/profile", {
      headers: { "x-request-id": "req-valid-12345678" },
    });
    const res = await metricsMiddleware(req, async () =>
      NextResponse.json({ ok: true }, { status: 200, headers: { "x-auth-user-id": "u-1", "x-auth-role": "student" } })
    );

    expect(res.status).toBe(200);
    // Internal auth headers must be stripped before reaching client
    expect(res.headers.get("x-auth-user-id")).toBeNull();
    expect(res.headers.get("x-auth-role")).toBeNull();
    expect(res.headers.get("x-u6-logged")).toBeNull();

    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].stream).toBe("stdout");
    expect(events[0].json).toMatchObject({
      level: "info",
      event: "http.request",
      request_id: "req-valid-12345678",
      method: "GET",
      route: "/api/student/profile",
      status: 200,
      source: "web",
      user_id: "u-1",
      role: "student",
    });
    expect(typeof events[0].json.duration_ms).toBe("number");
    expect(events[0].json.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("2. logs 400 validation/bad-request with level=warn and error_code", async () => {
    const req = makeReq("http://localhost/api/admin/announcements", { method: "POST" });
    const res = await metricsMiddleware(req, async () =>
      handleApiError(new ApiError("VALIDATION_ERROR", "Invalid input", 400), { route: "/api/admin/announcements" })
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("x-error-code")).toBeNull();
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].json).toMatchObject({
      level: "warn",
      status: 400,
      error_code: "VALIDATION_ERROR",
    });
  });

  it("3. logs 401 unauthorized with level=warn", async () => {
    const req = makeReq("http://localhost/api/admin/users");
    await metricsMiddleware(req, async () => NextResponse.json({ success: false }, { status: 401 }));
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].json).toMatchObject({ level: "warn", status: 401 });
  });

  it("4. logs 403 forbidden with level=warn", async () => {
    const req = makeReq("http://localhost/api/sysadmin/recovery", { method: "POST" });
    await metricsMiddleware(req, async () => NextResponse.json({ success: false }, { status: 403 }));
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].json).toMatchObject({ level: "warn", status: 403 });
  });

  it("5. logs 404 not-found with level=warn", async () => {
    const req = makeReq("http://localhost/api/passes/missing");
    await metricsMiddleware(req, async () => NextResponse.json({ success: false }, { status: 404 }));
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].json).toMatchObject({ level: "warn", status: 404 });
  });

  it("6. logs 429 rate-limit on public withRateLimit route with error_code=RATE_LIMIT_EXCEEDED", async () => {
    const handler = withRateLimit(
      async () => NextResponse.json({ ok: true }),
      { keyPrefix: "u6_test_429", maxRequests: 0, windowMs: 60_000 }
    );
    const req = makeReq("http://localhost/api/public/ping", {
      headers: { "x-client-ip": "10.0.0.99" },
    });
    const res = await handler(req);
    expect(res.status).toBe(429);
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].stream).toBe("stdout");
    expect(events[0].json).toMatchObject({
      level: "warn",
      event: "http.request",
      route: "/api/public/ping",
      status: 429,
      error_code: "RATE_LIMIT_EXCEEDED",
    });
  });

  it("7. logs 500 internal error on stderr without leaking stack or SQL in http.request", async () => {
    const req = makeReq("http://localhost/api/crash");
    const res = await metricsMiddleware(req, async () =>
      handleApiError(new Error("SELECT * FROM users WHERE password_hash='secret123'"), { route: "/api/crash" })
    );
    expect(res.status).toBe(500);
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].stream).toBe("stderr");
    expect(events[0].json).toMatchObject({
      level: "error",
      status: 500,
      error_code: "INTERNAL_ERROR",
    });
    expect(events[0].line).not.toContain("SELECT * FROM users");
    expect(events[0].line).not.toContain("secret123");
  });

  it("8. measures request duration accurately", async () => {
    const req = makeReq("http://localhost/api/slow");
    await metricsMiddleware(req, async () => {
      await new Promise((r) => setTimeout(r, 25));
      return NextResponse.json({ ok: true });
    });
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(Number(events[0].json.duration_ms)).toBeGreaterThanOrEqual(15);
  });

  it("9. validates and propagates X-Request-ID, replacing invalid/missing IDs with UUID", async () => {
    expect(sanitizeRequestId("valid-req-id_01")).toBe("valid-req-id_01");
    const minted = sanitizeRequestId("bad\nid with spaces!");
    expect(minted).toMatch(/^[0-9a-f-]{36}$/i);

    const req = makeReq("http://localhost/api/test", {
      headers: { "x-request-id": "bad id with spaces!" },
    });
    const res = await metricsMiddleware(req, async () => NextResponse.json({ ok: true }));
    const echoed = res.headers.get("x-request-id");
    expect(echoed).toMatch(/^[0-9a-f-]{36}$/i);
    expect(httpEvents()[0].json.request_id).toBe(echoed);
    expect(getRequestId(makeReq("http://localhost/api/test", { headers: { "x-request-id": "abc12345" } }))).toBe("abc12345");
  });

  it("10. redacts sensitive headers and keys", () => {
    const redacted = redactSensitive({
      authorization: "Bearer eyJ...",
      cookie: "access_token=xyz",
      "x-csrf-token": "csrf123",
      password: "p",
      otp: "123456",
      access_token: "at",
      refresh_token: "rt",
      secret: "s",
      safe: "ok",
    }) as Record<string, unknown>;

    expect(redacted.authorization).toBe("[REDACTED]");
    expect(redacted.cookie).toBe("[REDACTED]");
    expect(redacted["x-csrf-token"]).toBe("[REDACTED]");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.otp).toBe("[REDACTED]");
    expect(redacted.access_token).toBe("[REDACTED]");
    expect(redacted.refresh_token).toBe("[REDACTED]");
    expect(redacted.secret).toBe("[REDACTED]");
    expect(redacted.safe).toBe("ok");
  });

  it("11. excludes query strings and request bodies from http.request", async () => {
    const req = makeReq("http://localhost/api/auth/reset?token=supersecret&otp=9999", {
      method: "POST",
      body: JSON.stringify({ password: "MySecretPassword123" }),
    });
    await metricsMiddleware(req, async () => NextResponse.json({ ok: true }));
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].json.route).toBe("/api/auth/reset");
    expect(events[0].line).not.toContain("supersecret");
    expect(events[0].line).not.toContain("9999");
    expect(events[0].line).not.toContain("MySecretPassword123");
  });

  it("12. prevents log injection by stripping CR/LF/control chars and bounding length", () => {
    expect(sanitizeLogString("hello\r\n{\"fake\":true}\x00\x1b[31m", 64)).toBe("hello  {\"fake\":true}  [31m");
    logRequest({
      request_id: "req-12345678",
      method: "GET\nPOST",
      route: "/api/test\r\n{\"injected\":1}",
      status: 200,
      duration_ms: 5,
    });
    const events = httpEvents();
    expect(events).toHaveLength(1);
    expect(events[0].line.includes("\n")).toBe(false);
    expect(events[0].line.includes("\r")).toBe(false);
  });

  it("13. prevents duplicate http.request logs when withRateLimit wraps metricsMiddleware", async () => {
    const wrapped = withRateLimit(
      async (req) => metricsMiddleware(req, async () => NextResponse.json({ ok: true })),
      { keyPrefix: "u6_dedup", maxRequests: 100, windowMs: 60_000 }
    );
    const req = makeReq("http://localhost/api/dedup", {
      headers: { "x-client-ip": "10.0.0.5" },
    });
    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-u6-logged")).toBeNull();
    expect(httpEvents()).toHaveLength(1);
  });

  it("14. skips /api/health and /api/metrics by default, logs when LOG_HEALTH_CHECKS=1", async () => {
    await metricsMiddleware(makeReq("http://localhost/api/health"), async () => NextResponse.json({ status: "healthy" }));
    await metricsMiddleware(makeReq("http://localhost/api/metrics"), async () => new Response("ok"));
    expect(httpEvents()).toHaveLength(0);

    process.env.LOG_HEALTH_CHECKS = "1";
    await metricsMiddleware(makeReq("http://localhost/api/health"), async () => NextResponse.json({ status: "healthy" }));
    expect(httpEvents()).toHaveLength(1);
    expect(httpEvents()[0].json.route).toBe("/api/health");
  });

  it("15. logs streaming/SSE response once without buffering stream body", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: ping\n\n"));
        controller.close();
      },
    });
    const req = makeReq("http://localhost/api/events/stream");
    const res = await metricsMiddleware(req, async () =>
      new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } })
    );
    expect(res.status).toBe(200);
    expect(httpEvents()).toHaveLength(1);
    expect(httpEvents()[0].json.route).toBe("/api/events/stream");
  });
});
