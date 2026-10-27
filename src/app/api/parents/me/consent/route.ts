// src/app/api/parents/me/consent/route.ts
// POST /api/parents/me/consent — guardian consent for a pending pass ticket.
// Body: { ticket, granted: boolean }

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { addAudit, getStudentGuardianLink } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { ticket, granted } = (await req.json().catch(() => ({}))) as {
    ticket?: string;
    granted?: boolean;
  };
  if (!ticket || granted === undefined) {
    return fail("VALIDATION_ERROR", "ticket and granted required", 400);
  }

  const db = getSupabaseServiceClient();
  const { data: row, error: readErr } = await db
    .from("permissions")
    .select("id, student_user_id, stage_history, status")
    .eq("ticket_number", ticket)
    .maybeSingle();
  if (readErr || !row) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);

  // Only the linked guardian/parent of the requesting student may consent.
  const studentId = (row as { student_user_id?: string; requester_user_id?: string })
    .student_user_id ?? (row as { requester_user_id?: string }).requester_user_id;
  if (!studentId) return fail("VALIDATION_ERROR", "Ticket has no student", 400);
  const guardianId = await getStudentGuardianLink(studentId);
  if (guardianId !== auth.userId && auth.role !== "admin" && auth.role !== "sysadmin") {
    return fail("FORBIDDEN", "Not the linked guardian", 403);
  }

  const history = [
    ...(Array.isArray(row.stage_history) ? row.stage_history : []),
    {
      stage: "guardian_consent",
      actor_id: auth.userId,
      actor: { id: auth.userId, role: auth.role },
      action: granted ? "CONSENT_GRANTED" : "CONSENT_DENIED",
      timestamp: new Date().toISOString(),
    },
  ];

  const { error: upErr } = await db
    .from("permissions")
    .update({ stage_history: history, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (upErr) return fail("DB_ERROR", upErr.message, 500);

  await addAudit({
    action: granted ? "GUARDIAN_CONSENT_GRANTED" : "GUARDIAN_CONSENT_DENIED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ticket, studentUserId: row.student_user_id },
  });

  return ok({ ticket, granted });
}

export const POST = withAuthorization(handlePost);
