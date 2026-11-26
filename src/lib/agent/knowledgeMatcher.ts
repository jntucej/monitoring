import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { sanitizeAgentPayload } from "./redactor";

export interface ConfirmedKnowledgeRow {
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
  source_ref: string | null;
}

export interface KnowledgeMatchResult {
  matchType: "exact" | "partial" | "none";
  entry: ConfirmedKnowledgeRow | null;
  mismatchReason?: string;
}

export async function matchConfirmedKnowledge(
  questionText: string,
  scope: { classId?: string | null; subjectCode?: string | null; departmentId?: string | null; persona?: string | null },
  actorRole: string,
): Promise<KnowledgeMatchResult> {
  const tokens = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4)
    .slice(0, 6);

  if (tokens.length === 0) {
    return { matchType: "none", entry: null };
  }

  const { rows } = await query<ConfirmedKnowledgeRow>(
    `SELECT id, question_pattern, answer_text, topic, class_id, subject_code,
            department_id, persona, condition_note, also_applies_to,
            confirmed_by_role, source_kind, source_ref
       FROM public.confirmed_knowledge
      WHERE effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY created_at DESC
      LIMIT 50`,
  ).catch(() => ({ rows: [] as ConfirmedKnowledgeRow[] }));

  let best: ConfirmedKnowledgeRow | null = null;
  let bestScore = 0;

  for (const row of rows) {
    const hay = `${row.question_pattern} ${row.answer_text}`.toLowerCase();
    const score = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (!best || bestScore === 0) {
    return { matchType: "none", entry: null };
  }

  const safeEntry = sanitizeAgentPayload(best, actorRole);
  const classMatches =
    !best.class_id ||
    best.class_id === scope.classId ||
    (scope.classId ? best.also_applies_to.includes(scope.classId) : false);
  const subjectMatches = !best.subject_code || best.subject_code === scope.subjectCode;
  const deptMatches = !best.department_id || best.department_id === scope.departmentId;
  const personaMatches =
    !best.persona || best.persona === "all" || !scope.persona || best.persona === scope.persona;

  if (classMatches && subjectMatches && deptMatches && personaMatches) {
    return { matchType: "exact", entry: safeEntry };
  }

  const diffs: string[] = [];
  if (!classMatches && best.class_id) diffs.push(`class ${best.class_id}`);
  if (!subjectMatches && best.subject_code) diffs.push(`subject ${best.subject_code}`);
  if (!deptMatches && best.department_id) diffs.push(`department ${best.department_id}`);
  if (!personaMatches && best.persona) diffs.push(`persona ${best.persona}`);

  return {
    matchType: "partial",
    entry: safeEntry,
    mismatchReason: `Confirmed for ${diffs.join(", ")}; not yet confirmed for your current scope.`,
  };
}

export interface PreAnnouncementConfig {
  class_id: string | null;
  subject_code: string | null;
  target_group_slug: string;
  also_applies_to: string[];
  summary: string;
  require_noted: boolean;
  deadline: string | null;
  requires_senior_approval: boolean;
}

export function buildPreAnnouncementConfig(
  auth: AuthContext,
  params: {
    class_id?: string | null;
    subject_code?: string | null;
    target_group_slug: string;
    also_applies_to?: string[];
    summary: string;
    require_noted?: boolean;
    deadline?: string | null;
  },
): PreAnnouncementConfig {
  const seniorRoles = new Set(["principal", "vice_principal", "hod", "admin", "sysadmin"]);
  return {
    class_id: params.class_id ?? null,
    subject_code: params.subject_code ?? null,
    target_group_slug: params.target_group_slug,
    also_applies_to: params.also_applies_to ?? [],
    summary: params.summary.trim(),
    require_noted: params.require_noted ?? true,
    deadline: params.deadline ?? null,
    requires_senior_approval: !seniorRoles.has(auth.role),
  };
}
