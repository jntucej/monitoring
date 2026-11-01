// tests/student/curfew-ack.test.ts
// POST /api/student/curfew-acknowledge: returns 200, writes a warden
// notification, writes the audit row.
import { POST } from "@/app/api/student/curfew-acknowledge/route";

const calls: Array<{ fn: string; args: any[] }> = [];

jest.mock("@/lib/postgres", () => ({
  __esModule: true,
  query: jest.fn(async (...args: any[]) => {
    calls.push({ fn: "query", args });
    if (args[0]?.includes("student_details"))
      return { rows: [{ warden_id: "w-1" }] };
    return { rows: [] };
  }),
}));
jest.mock("@/lib/db", () => ({
  __esModule: true,
  addAudit: jest.fn(async (...args: any[]) => {
    calls.push({ fn: "addAudit", args });
  }),
}));
jest.mock("@/middleware/authorization", () => ({
  __esModule: true,
  withAuthorization: (handler: any) => async (req: any, ctx: any) =>
    handler(req, { ...ctx, auth: { userId: "u-1", role: "student", email: "s@x" } }),
}));
jest.mock("@/lib/rate-limit", () => ({
  __esModule: true,
  withRateLimit: (h: any) => h,
}));
jest.mock("@/lib/csrf", () => ({
  __esModule: true,
  assertCsrf: jest.fn(() => null),
}));
jest.mock("@/server/http/response", () => ({
  __esModule: true,
  ok: (d: any) => ({ ok: true, status: 200, json: async () => d }),
  fail: (code: string, msg: string, status: number) => ({
    ok: false,
    status,
    json: async () => ({ error: { code, message: msg } }),
  }),
}));

function makeReq(body: Record<string, unknown> = {}) {
  return {
    json: async () => body,
    headers: new Map([["x-csrf-token", "t"]]),
  } as any;
}

describe("POST /api/student/curfew-acknowledge", () => {
  beforeEach(() => calls.length = 0);

  it("returns 200 + writes notification + audit row", async () => {
    const res = await POST(makeReq({ expectedMinutes: 15 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.acknowledged).toBe(true);
    expect(body.wardenNotified).toBe(true);

    const insert = calls.find((c) => c.fn === "query" && c.args[0]?.includes("INSERT INTO public.notifications"));
    expect(insert).toBeTruthy();
    const audit = calls.find((c) => c.fn === "addAudit");
    expect(audit?.args[0].action).toBe("CURFEW_ACKNOWLEDGED");
  });

  it("clamps expectedMinutes into [1,120]", async () => {
    const res = await POST(makeReq({ expectedMinutes: 999 }));
    const body = await res.json();
    expect(body.expectedMinutes).toBe(120);
  });
});
