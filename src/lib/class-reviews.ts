// src/lib/class-reviews.ts
//
// DB-side functions for student-per-session class reviews, copying the
// mess-review pipeline's shape (mess-meal-reviews POST/summary/aggregate) onto
// the class_session_reviews table. Reviews are attributed to a faculty via
// the derived classSession (session_id + faculty_id), so the faculty dashboard
// can show "my class reviews" and an HOD can roll up by department.
//
// Server-only (imports pg). One review per (student, session) is enforced by
// the table's UNIQUE (student_id, session_id) constraint — a duplicate insert
// surfaces as a 23505 unique violation, which submitReview maps to a clean
// "already reviewed" error.

import { query } from "@/lib/postgres";
import type { ClassSession } from "@/lib/class-session";

export interface ClassReviewInput {
  sessionId: string;
  session: ClassSession;
  studentId: string | null;
  isAnonymous: boolean;
  rating: number; // 1..5
  note?: string;
}

export interface ClassReviewSummary {
  total: number;
  averageRating: number | null;
  byRating: Record<number, number>;
  /** per-session breakdown for a faculty's range. */
  bySession: Array<{
    sessionId: string;
    sessionDate: string;
    period: number;
    count: number;
    avg: number;
  }>;
}

/** Insert a review. Returns { ok, id } or { ok: false, reason }. */
export async function submitReview(input: ClassReviewInput): Promise<
  { ok: true; id: string } | { ok: false; reason: string }
> {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const { session } = input;
  try {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO public.class_session_reviews
         (session_id, class_id, subject_code, faculty_id, session_date,
          period, student_id, is_anonymous, rating, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.sessionId,
        session.classId,
        session.subjectCode,
        session.facultyId,
        session.date,
        session.period,
        input.isAnonymous ? null : input.studentId,
        input.isAnonymous,
        rating,
        input.note ? String(input.note).slice(0, 2000) : null,
      ],
    );
    return { ok: true, id: rows[0].id };
  } catch (e: unknown) {
    // 23505 = unique violation → already reviewed this session.
    if (
      e && typeof e === "object" &&
      (e as { code?: string }).code === "23505"
    ) {
      return { ok: false, reason: "ALREADY_REVIEWED" };
    }
    throw e;
  }
}

/** Does this student already have a review for this session? */
export async function hasReviewed(
  sessionId: string,
  studentId: string,
): Promise<boolean> {
  const { rows } = await query<{ n: string }>(
    `SELECT 1 AS n FROM public.class_session_reviews
      WHERE session_id = $1 AND student_id = $2 LIMIT 1`,
    [sessionId, studentId],
  );
  return rows.length > 0;
}

/** Aggregate a faculty's reviews across a date range. */
export async function facultySummary(
  facultyId: string,
  from: string | null,
  to: string | null,
): Promise<ClassReviewSummary> {
  const base = `FROM public.class_session_reviews r WHERE r.faculty_id = $1`;
  const params: unknown[] = [facultyId];
  let where = "";
  if (from) {
    params.push(from);
    where += ` AND r.session_date >= $${params.length}::date`;
  }
  if (to) {
    params.push(to);
    where += ` AND r.session_date <= $${params.length}::date`;
  }
  const { rows } = await query<{
    total: string;
    avg: string | null;
  }>(
    `SELECT COUNT(*)::int AS total, AVG(r.rating) AS avg
       ${base} ${where}`,
    params,
  );
  const total = Number(rows[0]?.total ?? 0);
  const averageRating = rows[0]?.avg != null ? Number(rows[0].avg) : null;

  const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const { rows: rateRows } = await query<{ rating: string; n: string }>(
    `SELECT r.rating::text AS rating, COUNT(*)::int AS n
       ${base} ${where}
      GROUP BY r.rating`,
    params,
  );
  for (const r of rateRows) byRating[Number(r.rating)] = Number(r.n);

  const { rows: sessRows } = await query<{
    session_id: string;
    session_date: string;
    period: string;
    count: string;
    avg: string;
  }>(
    `SELECT r.session_id, r.session_date::text, r.period::int,
            COUNT(*)::int AS count, ROUND(AVG(r.rating), 2)::numeric AS avg
       ${base} ${where}
      GROUP BY r.session_id, r.session_date, r.period
      ORDER BY r.session_date DESC`,
    params,
  );
  const bySession = sessRows.map((r) => ({
    sessionId: r.session_id,
    sessionDate: r.session_date,
    period: Number(r.period),
    count: Number(r.count),
    avg: Number(r.avg),
  }));

  return { total, averageRating, byRating, bySession };
}

/** HOD dept roll-up: average + total per faculty in a department. */
export async function deptRollup(
  departmentId: string,
  from: string | null,
  to: string | null,
): Promise<
  Array<{ facultyId: string; facultyName: string | null; total: number; avg: number | null }>
> {
  const base = `
       FROM public.class_session_reviews r
       JOIN public.users u ON u.id = r.faculty_id
       WHERE u.role IN ('faculty','staff')`;
  const params: unknown[] = [departmentId];
  let where = " AND u.department_id = $1::text";
  if (from) {
    params.push(from);
    where += ` AND r.session_date >= $${params.length}::date`;
  }
  if (to) {
    params.push(to);
    where += ` AND r.session_date <= $${params.length}::date`;
  }
  const { rows } = await query<{
    faculty_id: string;
    name: string | null;
    total: string;
    avg: string | null;
  }>(
    `SELECT r.faculty_id, u.name,
            COUNT(*)::int AS total, ROUND(AVG(r.rating), 2)::numeric AS avg
       ${base}${where}
      GROUP BY r.faculty_id, u.name
      ORDER BY total DESC`,
    params,
  );
  return rows.map((r) => ({
    facultyId: r.faculty_id,
    facultyName: r.name,
    total: Number(r.total),
    avg: r.avg != null ? Number(r.avg) : null,
  }));
}

/** A faculty's reply to a specific review (closes the loop). */
export async function replyToReview(
  reviewId: string,
  facultyId: string,
  reply: string,
): Promise<boolean> {
  const { rows } = await query<{ n: string }>(
    `UPDATE public.class_session_reviews
        SET note = COALESCE(note, '') || E'\n---\n' || $2::text
      WHERE id = $1 AND faculty_id = $3
      RETURNING 1 AS n`,
    [reviewId, reply, facultyId],
  );
  return rows.length > 0;
}
