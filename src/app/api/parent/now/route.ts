// /api/parent/now/route.ts
// Parent/guardian attendance-first /now: the child's per-subject %,
// at-risk flags, next exam, and mess bill — all child-scoped.
// This is the Family bot's first block (attendance is the anchor).

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  // Parent scope lock: only linked children
  const { rows: children } = await query<{
    id: string; name: string; roll: string; branch: string;
  }>(
    `SELECT u.id, u.name, sd.roll, sd.branch
       FROM public.users u
       JOIN public.student_details sd ON sd.user_id = u.id
      WHERE u.id IN (
          SELECT u2.id FROM public.users u2
          JOIN public.student_details sd2 ON sd2.user_id = u2.id
          WHERE sd2.guardian_id = $1
        )
        AND u.status = 'ACTIVE'
      ORDER BY u.name`,
    [auth.userId],
  );

  if (!children.length) {
    return fail("NO_CHILDREN", "No linked children found", 404);
  }

  const childBlocks = await Promise.all(
    children.map(async (child) => {
      // 1. Attendance (per-subject %)
      const { rows: attRows } = await query<{
        subject: string; pct: string; at_risk: boolean;
      }>(
        `SELECT sd2.course AS subject,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ar.status = 'present')
                      / NULLIF(COUNT(*), 0), 1) AS pct,
                (COUNT(*) FILTER (WHERE ar.status = 'present')::numeric
                 / NULLIF(COUNT(*), 0)) < 0.75 AS at_risk
           FROM public.student_details sd2
           LEFT JOIN public.attendance_records ar
                  ON ar.person_id = sd2.user_id AND ar.date >= DATE_TRUNC('month', now())
          WHERE sd2.user_id = $1
          GROUP BY sd2.course
          ORDER BY at_risk DESC, sd2.course`,
        [child.id],
      );
      const attendance = attRows.length
        ? attRows.map((r) =>
            `${r.subject} ${r.pct}%${r.at_risk ? " (below 75%)" : ""}`,
          ).join(" · ")
        : "No sessions marked yet";

      // 2. Next exam
      const { rows: examRows } = await query<{ label: string; when: string }>(
        `SELECT title AS label, message AS when
           FROM public.notifications
          WHERE recipient_id = $1 AND type = 'exam_upcoming' AND delivered_at IS NULL
          ORDER BY created_at LIMIT 1`,
        [child.id],
      );
      const nextExam = examRows.length
        ? `${examRows[0].label} - ${examRows[0].when}`
        : null;

      // 3. Mess bill
      const { rows: billRows } = await query<{ amount: string }>(
        `SELECT SUM(amount)::text AS amount FROM public.fee_items
          WHERE user_id = $1 AND type = 'mess' AND status = 'due'`,
        [child.id],
      );
      const messDue = billRows[0]?.amount ? `Mess due: Rs ${billRows[0].amount}` : null;

      // 4. Academic status
      const { rows: statusRows } = await query<{ status: string | null }>(
        `SELECT academic_status FROM public.student_details WHERE user_id = $1`,
        [child.id],
      );
      const academicStatus = statusRows[0]?.status ?? "ACTIVE";

      return {
        name: child.name,
        roll: child.roll,
        branch: child.branch,
        attendance,
        nextExam,
        messDue,
        academicStatus,
      };
    }),
  );

  return ok({
    children: childBlocks,
    // The Family bot's /now renders: child name, attendance first,
    // at-risk flags, next exam, mess due, academic status
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/parent/now",
  auth: "user",
  requiredRole: ["parent", "guardian", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "parent-now", maxRequests: 20, windowMs: 60_000 },
});
