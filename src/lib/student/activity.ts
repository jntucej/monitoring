import { query } from "@/lib/postgres";

export type ActivityCategory =
  | "academic"
  | "hostel"
  | "gate"
  | "mess"
  | "security"
  | "achievement"
  | "club"
  | "financial"
  | "system";

export async function emitActivity(input: {
  studentId: string;
  category: ActivityCategory;
  eventType: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorRole?: string;
  meta?: Record<string, unknown>;
}) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.student_activity
       (student_id, category, event_type, title, body, entity_type, entity_id, actor_id, actor_role, meta)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8::uuid, $9, $10::jsonb)
     RETURNING id`,
    [
      input.studentId,
      input.category,
      input.eventType,
      input.title,
      input.body ?? null,
      input.entityType ?? null,
      input.entityId ?? null,
      input.actorId ?? null,
      input.actorRole ?? null,
      JSON.stringify(input.meta ?? {}),
    ],
  );
  return rows[0];
}

export async function listActivityForUser(
  studentId: string,
  opts: { category?: string; from?: string; to?: string; limit?: number } = {},
) {
  const { rows } = await query(
    `SELECT *
       FROM public.student_activity
      WHERE student_id = $1::uuid
        AND archived_at IS NULL
        AND ($2::text IS NULL OR category = $2)
        AND ($3::timestamptz IS NULL OR occurred_at >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR occurred_at <= $4::timestamptz)
      ORDER BY occurred_at DESC
      LIMIT $5`,
    [studentId, opts.category ?? null, opts.from ?? null, opts.to ?? null, opts.limit ?? 100],
  );
  return rows;
}

export async function summarizeByCategory(studentId: string, days: number = 30) {
  const { rows } = await query<{ category: string; count: string }>(
    `SELECT category, COUNT(*)::text AS count
       FROM public.student_activity
      WHERE student_id = $1::uuid
        AND archived_at IS NULL
        AND occurred_at >= NOW() - ($2::int * INTERVAL '1 day')
      GROUP BY category
      ORDER BY category ASC`,
    [studentId, days],
  );
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const c = parseInt(r.count, 10);
    byCategory[r.category] = c;
    total += c;
  }
  return { days, total, by_category: byCategory };
}

export async function markActivityRead(studentId: string, id: string) {
  await query(
    `UPDATE public.student_activity SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1::uuid AND student_id = $2::uuid`,
    [id, studentId],
  );
}

export async function archiveActivity(studentId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const res = await query(
    `UPDATE public.student_activity SET archived_at = NOW()
      WHERE student_id = $1::uuid AND id = ANY($2::uuid[]) AND archived_at IS NULL`,
    [studentId, ids],
  );
  return res.rowCount ?? 0;
}
