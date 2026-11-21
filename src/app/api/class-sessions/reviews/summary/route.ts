// /api/class-sessions/reviews/summary
//
// GET — class-session review summaries. One endpoint, two audiences:
//   - a faculty (or authority passing facultyId=me/explicit) → their own
//     aggregate: total, average, byRating histogram, per-session breakdown.
//   - an authority with a dept filter (dept= / no filter for principal) →
//     the department roll-up: per-faculty totals + averages + overall.
//
// This mirrors the mess-review summary shape, one level up for the HOD/
// Principal roll-up card.
//
// Auth:
//   - faculty: facultyId=me (their own) or no facultyId (their own by role).
//   - authority: facultyId=<id> (any faculty) OR dept=<id|me|all> (roll-up).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { facultySummary, deptRollup } from "@/lib/class-reviews";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["principal", "hod", "vp", "sysadmin", "admin"];

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const facultyParam = url.searchParams.get("facultyId");
  const deptParam = url.searchParams.get("dept");
  const isAuthority = AUTHORITY.includes(auth.role);

  // ── dept roll-up path (authority, when dept is present or the caller is a
  //    broad authority asking for the institutional view) ───────────────────
  if (deptParam && isAuthority) {
    let departmentId: string | null = null;
    if (deptParam === "me") {
      const { rows } = await query<{ department_id: string | null }>(
        `SELECT department_id::text AS department_id FROM public.users WHERE id = $1 LIMIT 1`,
        [auth.userId],
      );
      departmentId = rows[0]?.department_id ?? null;
      if (!departmentId) return fail("NO_DEPARTMENT", "Your account has no department assigned", 400);
    } else if (deptParam !== "all") {
      departmentId = deptParam;
    } else {
      departmentId = null; // campus-wide
    }
    // A hod is scoped to their own dept; principal/sysadmin may go campus-wide.
    if (auth.role === "hod" && deptParam !== "me") {
      const { rows } = await query<{ department_id: string | null }>(
        `SELECT department_id::text AS department_id FROM public.users WHERE id = $1 LIMIT 1`,
        [auth.userId],
      );
      departmentId = rows[0]?.department_id ?? null;
    }
    const rollup = await deptRollup(departmentId ?? "", from, to);
    const totalReviews = rollup.reduce((n, f) => n + f.total, 0);
    const weighted = rollup.reduce((n, f) => n + (f.avg ?? 0) * f.total, 0);
    const overallAvg = totalReviews > 0 ? Math.round((weighted / totalReviews) * 100) / 100 : null;
    return ok({
      view: "dept",
      department: departmentId,
      from,
      to,
      faculty: rollup,
      totals: { facultyCount: rollup.length, reviews: totalReviews, overallAvg },
    });
  }

  // ── faculty self / authority-for-one-faculty path ────────────────────────
  let targetId: string | null = null;
  if (facultyParam === "me" || (!facultyParam && auth.role === "faculty")) {
    targetId = auth.userId;
  } else if (facultyParam) {
    if (!isAuthority) {
      return fail("FORBIDDEN", "You can only see your own reviews (or pass facultyId=me)", 403);
    }
    targetId = facultyParam;
  } else {
    return fail("VALIDATION_ERROR", "facultyId=me (or an authority passing an explicit id / dept) required", 400);
  }

  const summary = await facultySummary(targetId, from, to);
  return ok({ view: "faculty", facultyId: targetId, from, to, ...summary });
}

export const GET = withAuthorization(handleGet);
