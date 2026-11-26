import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
vi.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  db: {},
}));

import { proxy } from "@/middleware";
import { logAuditEvent } from "@/middleware/authorization";

describe("U8 — Payload Size Limit, Request-ID & Correlation Hardening", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it("rejects /api/* POST with Content-Length > 1MB with 413 PAYLOAD_TOO_LARGE and echoes x-request-id", async () => {
    const req = new NextRequest("http://localhost/api/admin/announcements", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(2 * 1024 * 1024),
        "x-request-id": "u8-valid-req-id-01",
      },
    });
    const res = await proxy(req);
    expect(res.status).toBe(413);
    expect(res.headers.get("x-request-id")).toBe("u8-valid-req-id-01");
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large." },
    });
  });

  it("allows /upload routes up to 25MB and rejects > 25MB with 413", async () => {
    const okUpload = new NextRequest("http://localhost/api/permissions/TKT-1/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=---abc",
        "content-length": String(5 * 1024 * 1024),
        "sec-fetch-site": "same-origin",
      },
    });
    const okRes = await proxy(okUpload);
    expect(okRes.status).not.toBe(413);

    const tooBigUpload = new NextRequest("http://localhost/api/permissions/TKT-1/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=---abc",
        "content-length": String(30 * 1024 * 1024),
      },
    });
    const bigRes = await proxy(tooBigUpload);
    expect(bigRes.status).toBe(413);
  });

  it("replaces invalid/forged x-request-id at the edge with a fresh UUID", async () => {
    const req = new NextRequest("http://localhost/api/health", {
      method: "GET",
      headers: { "x-request-id": "bad id with spaces!" },
    });
    const res = await proxy(req);
    const echoed = res.headers.get("x-request-id");
    expect(echoed).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("embeds request_id into audit_logs details via logAuditEvent", async () => {
    await logAuditEvent(
      "TEST_ACTION",
      "00000000-0000-0000-0000-000000000001",
      { foo: "bar" },
      "127.0.0.1",
      "admin",
      "Admin",
      "u8-corr-id-1234"
    );
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const params = mockQuery.mock.calls[0][1] as unknown[];
    const detailsJson = JSON.parse(String(params[5]));
    expect(detailsJson).toEqual({ foo: "bar", request_id: "u8-corr-id-1234" });
  });
});
