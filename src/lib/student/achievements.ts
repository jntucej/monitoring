import { createHmac } from "crypto";
import { query } from "@/lib/postgres";
import { emitActivity } from "./activity";

function getShareSecret(): string {
  return process.env.AUTH_JWT_SECRET || process.env.MESS_TOKEN_SECRET || "dev-share-secret";
}

export async function listTemplates() {
  const { rows } = await query(
    `SELECT * FROM public.achievement_templates WHERE active = true ORDER BY title ASC`,
  );
  return rows;
}

export async function awardAchievement(input: {
  studentId: string;
  templateId: string;
  awardedBy: string;
  awardedByRole: string;
  note?: string;
  evidenceUrl?: string;
}) {
  const { rows: tplRows } = await query<{
    id: string;
    code: string;
    title: string;
    visibility: string;
    awarder_role: string[];
  }>(
    `SELECT id, code, title, visibility, awarder_role
       FROM public.achievement_templates WHERE id = $1::uuid AND active = true LIMIT 1`,
    [input.templateId],
  );
  const tpl = tplRows[0];
  if (!tpl) return { ok: false as const, status: 404, error: "template_not_found" };

  if (
    !["admin", "sysadmin"].includes(input.awardedByRole) &&
    !tpl.awarder_role.includes(input.awardedByRole)
  ) {
    return { ok: false as const, status: 403, error: "role_cannot_award" };
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.user_achievements
       (user_id, achievement_code, template_id, verified_by, verified_at, awarded_by_role, note, evidence_url, scope)
     VALUES ($1::uuid, $2, $3::uuid, $4::uuid, NOW(), $5, $6, $7, $8)
     RETURNING id`,
    [
      input.studentId,
      tpl.code,
      tpl.id,
      input.awardedBy,
      input.awardedByRole,
      input.note ?? null,
      input.evidenceUrl ?? null,
      tpl.visibility,
    ],
  );

  await emitActivity({
    studentId: input.studentId,
    category: "achievement",
    eventType: "achievement_awarded",
    title: `Achievement awarded: ${tpl.title}`,
    body: input.note,
    entityType: "user_achievement",
    entityId: rows[0].id,
    actorId: input.awardedBy,
    actorRole: input.awardedByRole,
  }).catch(() => {});

  return { ok: true as const, id: rows[0].id, scope: tpl.visibility };
}

export function buildShareToken(achievementId: string): string {
  const sig = createHmac("sha256", getShareSecret())
    .update(achievementId)
    .digest("hex")
    .slice(0, 16);
  return `${achievementId}.${sig}`;
}

export async function resolveSharedAchievement(token: string, viewerId: string) {
  const [achievementId, sig] = token.split(".");
  if (!achievementId || !sig) return null;
  const expected = buildShareToken(achievementId).split(".")[1];
  if (sig !== expected) return null;

  const { rows: viewerRows } = await query<{
    department: string | null;
    semester: string | null;
    section: string | null;
  }>(
    `SELECT department, semester, section FROM public.student_details WHERE user_id = $1::uuid LIMIT 1`,
    [viewerId],
  );
  const v = viewerRows[0];
  const viewerClass = v?.department && v?.semester && v?.section ? `${v.department}-${v.semester}-${v.section}` : null;

  const { rows } = await query(
    `SELECT ua.id, ua.user_id, ua.scope, ua.note, ua.created_at,
            at.title, at.category, at.description,
            u.name AS student_name, u.unique_id AS roll_no,
            sd.department,
            (sd.department || '-' || sd.semester || '-' || sd.section) AS class_id
       FROM public.user_achievements ua
       JOIN public.achievement_templates at ON at.id = ua.template_id
       JOIN public.users u ON u.id = ua.user_id
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE ua.id = $1::uuid
        AND ua.revoked_at IS NULL
        AND (
          ua.scope = 'campus'
          OR ua.user_id = $2::uuid
          OR (ua.scope = 'dept' AND sd.department = $3)
          OR (ua.scope = 'class' AND (sd.department || '-' || sd.semester || '-' || sd.section) = $4)
        )
      LIMIT 1`,
    [achievementId, viewerId, v?.department ?? null, viewerClass],
  );
  return rows[0] ?? null;
}
