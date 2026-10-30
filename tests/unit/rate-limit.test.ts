import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/postgres", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/postgres";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";

const mockQuery = vi.mocked(query);

function makeReq(ip = "10.0.0.1", path = "/api/test"): any {
  return {
    headers: new Map([["x-client-ip", ip]]) as any,
    nextUrl: { pathname: path },
    ip,
  };
}

describe("withRateLimit", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("allows requests under the limit", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] } as any);
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 10 });
    const res = await wrapped(makeReq());
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns 429 over the limit", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 11 }] } as any);
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 10 });
    const res = await wrapped(makeReq());
    expect(res.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("extractClientIp", () => {
  it("prefers x-client-ip", () => {
    expect(extractClientIp(makeReq("1.2.3.4"))).toBe("1.2.3.4");
  });
  it("ignores x-forwarded-for", () => {
    const req: any = {
      headers: new Map([["x-forwarded-for", "9.9.9.9"]]) as any,
      ip: "1.2.3.4",
    };
    expect(extractClientIp(req)).toBe("1.2.3.4");
  });
});
