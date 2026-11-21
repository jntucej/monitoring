// /api/class-sessions/confirm-bulk
//
// POST { sessionIds: string[], action: "confirm" | "request-substitute",
//        context?: [{ sessionId, classId, periodNo, sessionDate, facultyId }],
//        substituteFacultyId? }
//
// The bulk confirmation action ("confirm all my classes today"). Models
// /api/permissions/bulk: single-phase (the action is idempotent — confirming
// twice is a no-op, so no two-phase validate→commit needed), returns
// per-item results. Each item reuses recordConfirmation (the single-confirm
// path), so the audit + student notification behavior is identical to the
// single endpoint.
//
// A faculty confirms all of their own sessions in one call; an authority may
// confirm on behalf of a faculty for all of that faculty's sessions.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { recordConfirmation } from "@/lib/class-confirmation";
import { addAudit, addNotification, query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];
const MAX_SESSIONS = 100;

interface ConfirmItem {
  sessionId: string;
  classId?: string;
  periodNo?: number;
  sessionDate?: string;
  facultyId?: string;
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const isAuthority = AUTHORITY.includes(auth.role);
  if (auth.role !== "faculty" && !isAuthority) {
    return fail("FORBIDDEN", "Only faculty or an authority may bulk-confirm sessions", 403);
  }

  const body = (await req.json().catch(() => ({}))) as {
    sessionIds?: string[];
    items?: ConfirmItem[];
    action?: string;
    substituteFacultyId?: string;
    facultyId?: string;
  };
  const action = body.action === "request-substitute" ? "request-substitute" : "confirm";

  // Accept either a flat sessionIds[] (with a shared context) or a full items[].
  const items: ConfirmItem[] =
    body.items && body.items.length > 0
      ? body.items
      : ((body.sessionIds ?? []) as string[]).map((id) => ({
          sessionId: id,
          classId: body.facultyId ? undefined : undefined,
          periodNo: undefined,
          sessionDate: undefined,
          facultyId: undefined,
        }));

  if (items.length === 0) {
    return fail("VALIDATION_ERROR", "sessionIds (or items) required", 400);
  }
  if (items.length > MAX_SESSIONS) {
    return fail("VALIDATION_ERROR", `Too many sessions (max ${MAX_SESSIONS})`, 400);
  }

  const confirmed: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const it of items) {
    const sessionId = it.sessionId;
    if (!sessionId) {
      failed.push({ id: String(sessionId ?? ""), reason: "missing sessionId" });
      continue;
    }
    try {
      let facultyId: string;
      if (auth.role === "faculty") {
        // A faculty bulk-confirms their OWN sessions; the session's faculty is
        // verified server-side via class_periods when context is provided.
        if (it.classId && it.periodNo !== undefined && it.sessionDate) {
          const dow = new Date(`${it.sessionDate}T00:00:00Z`).getUTCDay();
          const { rows } = await query<{ faculty_id: string | null }>(
            `SELECT faculty_id::text FROM public.class_periods
              WHERE class_id = $1::uuid AND period_no = $2 AND day_of_week = $3 LIMIT 1`,
            [it.classId, it.periodNo, dow],
          );
          if (rows[0]?.faculty_id && rows[0].faculty_id !== auth.userId) {
            failed.push({ id: sessionId, reason: "not your scheduled session" });
            continue;
          }
        }
        facultyId = auth.userId;
      } else {
        facultyId = it.facultyId ?? body.facultyId ?? "";
        if (!facultyId) {
          failed.push({ id: sessionId, reason: "facultyId required for authority on-behalf" });
          continue;
        }
      }

      const result = await recordConfirmation({
        sessionId,
        facultyId,
        action,
        actorId: auth.userId,
        substituteFacultyId: body.substituteFacultyId,
        classId: it.classId,
        periodNo: it.periodNo,
        sessionDate: it.sessionDate,
      });

      if (result.status === "CONFIRMED" && result.changed && it.classId) {
        // Mirror the single-confirm student notification.
        const { rows: cls } = await query<{ section: string; year: number; department_id: string }>(
          `SELECT section::text, year::int, department_id::text FROM public.classes WHERE id = $1::uuid LIMIT 1`,
          [it.classId],
        );
        const meta = cls[0];
        if (meta) {
          const students = await query<{ user_id: string }>(
            `SELECT sd.user_id::text FROM public.student_details sd
              WHERE sd.section::text = $1 AND sd.year = $2 AND sd.branch::text = $3
                AND EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = sd.user_id::text
                            AND u.role = 'student' AND u.status = 'ACTIVE')
              LIMIT 500`,
            [meta.section, meta.year, meta.department_id],
          );
          for (const s of students.rows) {
            await addNotification(
              "user",
              s.user_id,
              "class.confirmation.confirmed",
              `Class confirmed — Period ${it.periodNo ?? ""}`,
              `Your scheduled class is confirmed for ${it.sessionDate ?? ""}.`,
            );
          }
        }
      }

      confirmed.push(sessionId);
    } catch (e) {
      failed.push({ id: sessionId, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  await addAudit({
    action: action === "confirm" ? "CLASS_CONFIRM_BULK" : "CLASS_SUBSTITUTE_REQUEST_BULK",
    userId: auth.userId,
    role: auth.role,
    details: { count: items.length, confirmed: confirmed.length, failed: failed.length },
  });

  return ok({ confirmed, failed, total: items.length });
}

export const POST = withMutationGuard(handlePost);
