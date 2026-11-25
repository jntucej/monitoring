/**
 * tests/gate/service/student-surfaces.test.ts — Hard guards for Student Surfaces:
 *   1. resolveScope: mess_token_available=false when state != 'in_hostel'; day scholar hostel_resident=false; library_member=false; is_cr=false
 *   2. verifyIdentityQr: valid today, rejects mutated HMAC, rejects 2+ days old
 *   3. getDayComposite: returns all 5 sections
 *   4. buildClassRequestMetrics: 62 class, 47 responses, yes=38, maybe=6 → 66.1% passed, 47 rows
 *   5. resolveSharedAchievement: cross-class viewer → null (404)
 *   6. listForClass: cross-class student → 403, HOD → ok
 */
const mockQuery = jest.fn();

jest.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { resolveScope } from "@/lib/student/scope";
import { signIdentityRoll, verifyIdentityQr } from "@/lib/student/qr";
import { getDayComposite, buildClassRequestMetrics } from "@/lib/student/calendar";
import { buildShareToken, resolveSharedAchievement } from "@/lib/student/achievements";
import { listForClass } from "@/lib/student/leaderboard";

const STU_1 = "11111111-1111-4111-8111-111111111111";
const STU_2 = "22222222-2222-4222-8222-222222222222";
const REQ_1 = "33333333-3333-4333-8333-333333333333";
const ACH_1 = "44444444-4444-4444-8444-444444444444";

describe("Student surfaces hard guards", () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = "unit-test-student-secret";
    mockQuery.mockReset();
  });

  it("1. resolveScope gates mess_token_available on in_hostel, hides hostel/library/CR when absent", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        role: "student",
        hostel_block: null,
        student_type: "day_scholar",
        class_representative: false,
        presence_state: "on_campus",
        presence_block: null,
        presence_since: null,
        mess_active: false,
        lib_active: false,
      }],
    });
    const s = await resolveScope(STU_1);
    expect(s.scopes.mess_token_available).toBe(false);
    expect(s.scopes.hostel_resident).toBe(false);
    expect(s.scopes.library_member).toBe(false);
    expect(s.scopes.is_cr).toBe(false);
    expect(s.academics_visible).toBe(true);
  });

  it("2. verifyIdentityQr accepts valid today, rejects mutated HMAC and expired salt", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const salt = "abc123";
    const sig = signIdentityRoll("23JJ1A0599", salt);

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.users")) return { rows: [{ id: STU_1 }] };
      if (sql.includes("FROM public.student_qr_salts")) return { rows: [{ salt_day: today, salt }] };
      return { rows: [] };
    });

    const okRes = await verifyIdentityQr(`ID|23JJ1A0599|${sig}`);
    expect(okRes).toEqual({ ok: true, studentId: STU_1, roll: "23JJ1A0599" });

    const badRes = await verifyIdentityQr(`ID|23JJ1A0599|${"0".repeat(32)}`);
    expect(badRes).toEqual({ ok: false, reason: "invalid" });

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.users")) return { rows: [{ id: STU_1 }] };
      if (sql.includes("FROM public.student_qr_salts")) return { rows: [] };
      return { rows: [] };
    });
    const expRes = await verifyIdentityQr(`ID|23JJ1A0599|${sig}`);
    expect(expRes).toEqual({ ok: false, reason: "expired_salt" });
  });

  it("3. getDayComposite returns all 5 sections", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const day = await getDayComposite(STU_1, "2026-11-25");
    expect(Object.keys(day).sort()).toEqual(["classes", "date", "events", "pending", "personal", "requests"]);
  });

  it("4. buildClassRequestMetrics: 62 class, 47 responses, yes=38, maybe=6 → 66.1% passed", async () => {
    const votes = [
      ...Array.from({ length: 38 }, (_, i) => ({ roll_no: `R${i}`, name: `S${i}`, vote: "yes", voted_at: "2026-11-25T10:00:00Z" })),
      ...Array.from({ length: 6 }, (_, i) => ({ roll_no: `M${i}`, name: `M${i}`, vote: "maybe", voted_at: "2026-11-25T10:00:00Z" })),
      ...Array.from({ length: 3 }, (_, i) => ({ roll_no: `N${i}`, name: `N${i}`, vote: "no", voted_at: "2026-11-25T10:00:00Z" })),
    ];
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.class_requests")) {
        return { rows: [{ id: REQ_1, title: "Extra DS", class_id: "CSE-5-A", min_interest_pct: "0.50" }] };
      }
      if (sql.includes("COUNT(*)::text AS cnt")) {
        return { rows: [{ cnt: "62" }] };
      }
      if (sql.includes("FROM public.class_request_interest")) {
        return { rows: votes };
      }
      return { rows: [] };
    });

    const m = await buildClassRequestMetrics(REQ_1);
    expect(m?.responses).toBe(47);
    expect(m?.weighted_pct).toBe(66.1);
    expect(m?.passed).toBe(true);
    expect(m?.rows.length).toBe(47);
  });

  it("5. resolveSharedAchievement returns null for cross-class viewer", async () => {
    const token = buildShareToken(ACH_1);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.student_details")) {
        return { rows: [{ department: "ECE", semester: "5", section: "A" }] };
      }
      return { rows: [] };
    });
    const res = await resolveSharedAchievement(token, STU_2);
    expect(res).toBeNull();
  });

  it("6. listForClass blocks cross-class student (403) and allows HOD", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ class_id: "ECE-5-A" }] });
    const denied = await listForClass("CSE-5-A", STU_2, "student");
    expect(denied).toEqual({ ok: false, status: 403, error: "cross_class_forbidden" });

    mockQuery.mockResolvedValueOnce({ rows: [{ class_id: "CSE-5-A", student_id: STU_1, roll_no: "23JJ1A0599", full_name: "Alice", department: "CSE", attendance_pct: "98.0", marks_pct: "90.0", achievement_count: 2 }] });
    const allowed = await listForClass("CSE-5-A", STU_2, "hod");
    expect(allowed.ok).toBe(true);
  });
});
