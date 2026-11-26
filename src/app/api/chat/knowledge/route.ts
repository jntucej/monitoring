import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
] as const;

const CONFIRMER_ROLES = new Set([
  "faculty", "hod", "deputy_warden", "hostel_manager", "oie", "exam_branch",
  "exam_superintendent", "vice_principal", "principal", "admin", "sysadmin",
  "dean", "chief_warden", "controller_examinations",
]);

async function handleGet(req: Request, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const classId = url.searchParams.get("class_id");

  const { rows } = await query<{
    id: string;
    question_pattern: string;
    answer_text: string;
    topic: string;
    class_id: string | null;
    subject_code: string | null;
    department_id: string | null;
    persona: string;
    condition_note: string | null;
    also_applies_to: string[];
    confirmed_by_role: string;
    source_kind: string;
    created_at: string;
  }>(
    `SELECT id, question_pattern, answer_text, topic, class_id, subject_code,
            department_id, persona, condition_note, also_applies_to,
            confirmed_by_role, source_kind, created_at
       FROM public.confirmed_knowledge
      WHERE effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to > NOW())
        AND ($1::text IS NULL OR class_id IS NULL OR class_id = $1 OR $1 = ANY(also_applies_to))
      ORDER BY created_at DESC
      LIMIT 50`,
    [classId],
  );

  return ok({ entries: sanitizeAgentPayload(rows, auth.role) });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  if (!CONFIRMER_ROLES.has(auth.role)) {
    return fail("FORBIDDEN", "Only faculty or authority roles can save confirmed knowledge.", 403);
  }

  const body = await req.json().catch(() => null);
  const questionPattern = typeof body?.question_pattern === "string" ? body.question_pattern.trim() : "";
  const answerText = typeof body?.answer_text === "string" ? body.answer_text.trim() : "";
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "academic";
  const classId = typeof body?.class_id === "string" ? body.class_id.trim() || null : null;
  const subjectCode = typeof body?.subject_code === "string" ? body.subject_code.trim() || null : null;
  const departmentId = typeof body?.department_id === "string" ? body.department_id.trim() || null : null;
  const persona = typeof body?.persona === "string" ? body.persona.trim() : "all";
  const conditionNote = typeof body?.condition_note === "string" ? body.condition_note.trim() || null : null;
  const alsoAppliesTo = Array.isArray(body?.also_applies_to)
    ? body.also_applies_to.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];
  const effectiveTo =
    typeof body?.effective_to === "string" && body.effective_to.trim()
      ? body.effective_to.trim()
      : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  if (!questionPattern || !answerText) {
    return fail("BAD_REQUEST", "question_pattern and answer_text are required.", 400);
  }

  const { rows } = await query<{ id: string; topic: string; class_id: string | null; also_applies_to: string[] }>(
    `INSERT INTO public.confirmed_knowledge
       (question_pattern, answer_text, topic, class_id, subject_code, department_id,
        persona, condition_note, effective_to, also_applies_to, confirmed_by, confirmed_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::text[], $11::uuid, $12)
     RETURNING id, topic, class_id, also_applies_to`,
    [
      questionPattern,
      answerText,
      topic,
      classId,
      subjectCode,
      departmentId,
      persona,
      conditionNote,
      effectiveTo,
      alsoAppliesTo,
      auth.userId,
      auth.role,
    ],
  );

  return ok({ entry: sanitizeAgentPayload(rows[0], auth.role) }, 201);
}

export const GET = withAuthorization(handleGet, { requiredRole: [...ALL_CHAT_ROLES] });
export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });
