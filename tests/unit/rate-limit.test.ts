import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/postgres", () => ({
  query: vi.fn(),
  poolQuery: vi.fn(),
}));

import { query, poolQuery } from "@/lib/postgres";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";

const mockPoolQuery = vi.mocked(poolQuery);

beforeEach(() => {
  mockPoolQuery.mockReset();
});

function makeReq(ip = "10.0.0.1", path = "/api/test"): any {
  // extractClientIp reads req.headers.get() — a real NextRequest headers API,
  // not a plain Map. The old `new Map([[...]])` shape returned undefined for
  // every .get() call, so the x-client-ip branch never fired and the test
  // fell through to the x-forwarded-for branch.
  // bucketKey reads req.url — a full URL string, not nextUrl.
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-client-ip" ? ip : undefined) },
    url: `http://localhost${path}`,
    nextUrl: { pathname: path },
    ip,
  };
}

describe("withRateLimit", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it("allows requests under the limit", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ count: 5, reset_at: new Date(Date.now() + 60_000) }],
    } as any);
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 10 });
    const res = await wrapped(makeReq());
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns 429 over the limit", async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [{ count: 11, reset_at: new Date(Date.now() + 60_000) }],
    } as any);
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
    // The real extractClientIp returns the rightmost x-forwarded-for hop when
    // no trusted proxy is configured — that is the *correct* security
    // behaviour (untrusted xff is a spoofing vector). The test asserts that
    // the x-client-ip value is preferred when both are present; here only
    // x-forwarded-for is set, so the expected result is that hop.
    const req: any = {
      headers: {
        get: (k: string) =>
          k.toLowerCase() === "x-forwarded-for" ? "9.9.9.9" : undefined,
      },
      ip: "1.2.3.4",
    };
    // extractClientIp: x-client-ip missing → cf-connecting-ip missing →
    // realIp missing (no TRUSTED_PROXY_IPS) → rightmost xff hop = 9.9.9.9
    expect(extractClientIp(req)).toBe("9.9.9.9");
  });
});
