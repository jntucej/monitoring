import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

const buckets = new Map<string, { count: number; resetAt: number }>();

vi.mock("@/lib/postgres", () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  poolQuery: vi.fn().mockImplementation(async (_sql: string, params: unknown[]) => {
    const key = String(params?.[0] ?? "default");
    const windowMs = Number(params?.[1] ?? 60_000);
    const now = Date.now();
    const cur = buckets.get(key);
    if (!cur || cur.resetAt <= now) {
      const next = { count: 1, resetAt: now + windowMs };
      buckets.set(key, next);
      return { rows: [{ count: next.count, reset_at: new Date(next.resetAt).toISOString() }] };
    }
    cur.count += 1;
    return { rows: [{ count: cur.count, reset_at: new Date(cur.resetAt).toISOString() }] };
  }),
}));

const mockRequireAuthUser = vi.fn();
vi.mock("@/lib/authContext", () => ({
  requireAuthenticatedUser: (...args: unknown[]) => mockRequireAuthUser(...args),
  requirePermission: vi.fn().mockResolvedValue(undefined),
  validateResourceOperation: vi.fn().mockResolvedValue(undefined),
  getGateStudentInfo: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth-token", () => ({
  verifyAccessToken: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/device-binding", () => ({
  checkDeviceBinding: vi.fn().mockReturnValue("ok"),
}));

vi.mock("@/middleware/entityAuthorization", () => ({
  resolveEffectiveRole: vi.fn().mockResolvedValue({ delegationId: null }),
}));

vi.mock("@/lib/dbClient", () => ({
  getSupabaseServiceClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  addAudit: vi.fn(),
  addNotification: vi.fn(),
}));

import { GET as campusMeGet } from "@/app/api/campus/me/route";
import { POST as uploadPost } from "@/app/api/permissions/[ticket]/upload/route";

function walkRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkRoutes(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

describe("U7 Phase 2 — 45-site migration verification", () => {
  beforeEach(() => {
    buckets.clear();
    mockRequireAuthUser.mockReset();
  });

  it("has zero remaining withRateLimit(withAuthorization(...)) sites across all 44 audited Phase 2 files", () => {
    const apiRoot = path.resolve(process.cwd(), "src/app/api");
    const phase2Files = [
      "admin/hostel-tickets/route.ts",
      "admin/role-requests/route.ts",
      "admin/users/route.ts",
      "campus-extra/analytics/route.ts",
      "campus-extra/calendar/route.ts",
      "campus-extra/feedback/route.ts",
      "campus-extra/handover/route.ts",
      "campus-extra/knowledge/route.ts",
      "campus-extra/portfolio/route.ts",
      "campus-extra/task-drafts/route.ts",
      "campus/achievements/route.ts",
      "campus/events/route.ts",
      "campus/feed/route.ts",
      "campus/goals/route.ts",
      "campus/me/route.ts",
      "campus/recap/route.ts",
      "deputy-warden/delegation/route.ts",
      "feedback/route.ts",
      "gate/verify-pass/route.ts",
      "me/access-log/route.ts",
      "me/consent/route.ts",
      "me/workspace/route.ts",
      "notifications/preferences/route.ts",
      "permissions/[ticket]/document/route.ts",
      "permissions/my-counts/route.ts",
      "students/[roll]/route.ts",
      "users/route.ts",
      "anti-ragging/report/route.ts",
      "campus/events/[id]/register/route.ts",
      "campus/goals/[id]/complete/route.ts",
      "complaints/[id]/call/route.ts",
      "complaints/route.ts",
      "emergency/sos/route.ts",
      "gate/scan/[id]/route.ts",
      "mess/token/[code]/send-sms/route.ts",
      "permissions/[ticket]/amend/route.ts",
      "permissions/[ticket]/biometric/route.ts",
      "permissions/[ticket]/forward/route.ts",
      "permissions/[ticket]/route.ts",
      "permissions/[ticket]/sign/route.ts",
      "student/emergency-alert/route.ts",
      "student/guardian-link/route.ts",
      "student/meal-opt-out/route.ts",
      "permissions/[ticket]/upload/route.ts",
    ];
    const liveInverted: string[] = [];
    const re = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*withRateLimit\(\s*withAuthorization\(/;
    for (const rel of phase2Files) {
      const txt = fs.readFileSync(path.join(apiRoot, rel), "utf8");
      if (re.test(txt)) liveInverted.push(rel);
    }
    expect(liveInverted).toEqual([]);
  });

  it("Batch A (GET /api/campus/me): rejects unauthenticated with 401 before touching rate-limit buckets", async () => {
    mockRequireAuthUser.mockRejectedValue(new Error("UNAUTHORIZED: Missing token"));
    const req = new NextRequest("http://localhost/api/campus/me", {
      method: "GET",
      headers: { "x-client-ip": "198.51.100.42" },
    });
    const res = await campusMeGet(req);
    expect(res.status).toBe(401);
    expect(buckets.size).toBe(0);
  });

  it("Batch C (POST /api/permissions/[ticket]/upload): rejects unauthenticated with 401 and preserves multipart handling", async () => {
    mockRequireAuthUser.mockRejectedValue(new Error("UNAUTHORIZED: Missing token"));
    const form = new FormData();
    form.append("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");
    const req = new NextRequest("http://localhost/api/permissions/TKT-1/upload", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
      body: form,
    });
    const res = await uploadPost(req);
    expect(res.status).toBe(401);
    expect(buckets.size).toBe(0);
  });
});
