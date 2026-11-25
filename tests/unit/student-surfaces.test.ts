import { describe, it, expect, beforeAll } from "vitest";
import { parsePdfAnnouncementHeuristics } from "../../src/lib/student/feed";
import { signIdentityRoll } from "../../src/lib/student/qr";

beforeAll(() => {
  process.env.AUTH_JWT_SECRET = "test-student-qr-secret";
});

describe("Student surfaces pure guards", () => {
  it("PDF ingest heuristic extracts expiry, dept scope, and draft status", () => {
    const res = parsePdfAnnouncementHeuristics({
      title: "Sem 5 timetable v2 effective 25 Nov",
      text: "For III B.Tech CSE students. Valid until 31 Dec 2025.",
    });
    expect(res.status).toBe("draft");
    expect(res.target_scope).toBe("dept:CSE");
    expect(res.expires_at).toContain("2025-12-31");
  });

  it("Identity QR signature is deterministic for same roll+salt and differs on mutation", () => {
    const s1 = signIdentityRoll("23JJ1A0599", "salt-day-1");
    const s2 = signIdentityRoll("23JJ1A0599", "salt-day-1");
    const s3 = signIdentityRoll("23JJ1A0598", "salt-day-1");
    expect(s1).toBe(s2);
    expect(s1).not.toBe(s3);
  });
});
