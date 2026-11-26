import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { sanitizeAgentPayload } from "./redactor";

export type StudentPersona = "hosteller" | "day_scholar" | "unknown";
export type StudentStanding = "active" | "detained" | "debarred" | "suspended" | "graduated" | "unknown";

export interface StudentCapabilitySet {
  persona: StudentPersona;
  standing: StudentStanding;
  is_class_rep: boolean;
  can_request_pass: boolean;
  can_submit_doubt: boolean;
  can_route_doubt: boolean;
  can_mark_noted: boolean;
  can_view_hostel_curfew: boolean;
  restrictions: string[];
}

export interface RequestContextEnvelope {
  role: string;
  route: string | null;
  group_id: string | null;
  class_id: string | null;
  subject_code: string | null;
  department_id: string | null;
  timestamp: string;
  student_capabilities: StudentCapabilitySet | null;
  entity_context: Record<string, unknown>;
}

export async function resolveStudentCapabilities(
  auth: AuthContext,
  groupMemberRole?: string | null,
): Promise<StudentCapabilitySet | null> {
  if (auth.role !== "student") return null;

  const { rows } = await query<{
    residence_type: string | null;
    academic_status: string | null;
  }>(
    `SELECT residence_type, academic_status
       FROM public.student_details
      WHERE user_id = $1::uuid
      LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] }));

  const row = rows[0];
  const rawPersona = (row?.residence_type ?? "").toLowerCase();
  const persona: StudentPersona =
    rawPersona === "hosteller" || rawPersona === "hostel"
      ? "hosteller"
      : rawPersona === "day_scholar" || rawPersona === "dayscholar"
        ? "day_scholar"
        : "unknown";

  const rawStanding = (row?.academic_status ?? "active").toLowerCase();
  const standing: StudentStanding =
    rawStanding === "active" ||
    rawStanding === "detained" ||
    rawStanding === "debarred" ||
    rawStanding === "suspended" ||
    rawStanding === "graduated"
      ? (rawStanding as StudentStanding)
      : "active";

  const restricted = standing === "detained" || standing === "debarred" || standing === "suspended" || standing === "graduated";
  const isClassRep = groupMemberRole === "moderator" || groupMemberRole === "owner";

  const restrictions: string[] = [];
  if (restricted) {
    restrictions.push(`Academic standing is '${standing}'; pass requests and escalations are gated.`);
  }

  return {
    persona,
    standing,
    is_class_rep: isClassRep,
    can_request_pass: !restricted,
    can_submit_doubt: !restricted,
    can_route_doubt: !restricted && isClassRep,
    can_mark_noted: true,
    can_view_hostel_curfew: persona === "hosteller",
    restrictions,
  };
}

export async function buildRequestContextEnvelope(
  auth: AuthContext,
  opts: {
    route?: string | null;
    groupId?: string | null;
    classId?: string | null;
    subjectCode?: string | null;
    entityContext?: Record<string, unknown>;
  } = {},
): Promise<RequestContextEnvelope> {
  let resolvedClassId = opts.classId ?? null;
  let memberRole: string | null = null;

  if (opts.groupId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opts.groupId);
    const { rows } = await query<{ class_id: string | null; member_role: string }>(
      `SELECT g.class_id, m.member_role
         FROM public.chat_groups g
         JOIN public.chat_group_members m ON m.group_id = g.id
        WHERE ${isUuid ? "g.id = $1::uuid" : "g.slug = $1"}
          AND m.user_id = $2::uuid
        LIMIT 1`,
      [opts.groupId, auth.userId],
    ).catch(() => ({ rows: [] }));
    if (rows[0]) {
      resolvedClassId = resolvedClassId ?? rows[0].class_id;
      memberRole = rows[0].member_role;
    }
  }

  const studentCapabilities = await resolveStudentCapabilities(auth, memberRole);

  return sanitizeAgentPayload(
    {
      role: auth.role,
      route: opts.route ?? null,
      group_id: opts.groupId ?? null,
      class_id: resolvedClassId,
      subject_code: opts.subjectCode ?? null,
      department_id: auth.departmentId ?? null,
      timestamp: new Date().toISOString(),
      student_capabilities: studentCapabilities,
      entity_context: opts.entityContext ?? {},
    },
    auth.role,
  );
}
