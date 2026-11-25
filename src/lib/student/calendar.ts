import { query } from "@/lib/postgres";

export interface DayComposite {
  date: string;
  classes: unknown[];
  pending: unknown[];
  requests: unknown[];
  personal: unknown[];
  events: unknown[];
}

export async function getDayComposite(
  studentId: string,
  date: string,
): Promise<DayComposite> {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay() || 7; // 1..7

  const [classesRes, pendingRes, requestsRes, eventsRes] = await Promise.all([
    query(
      `SELECT cp.id, cp.subject_code, cp.start_time, cp.end_time, cp.room, cp.slot_status
         FROM public.class_periods cp
        WHERE cp.day_of_week = $1
        ORDER BY cp.start_time ASC
        LIMIT 20`,
      [dow],
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT id, title, due_date::text, status
         FROM public.assignments
        WHERE due_date::date = $1::date
        ORDER BY due_date ASC
        LIMIT 20`,
      [date],
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT id, title, request_type, posted_by_role, status_v2, interest_window_end
         FROM public.class_requests
        WHERE status_v2 = 'open'
          AND (interest_window_end IS NULL OR interest_window_end::date >= $1::date)
        ORDER BY created_at DESC
        LIMIT 20`,
      [date],
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT id, title, event_date::text, venue
         FROM public.campus_events
        WHERE event_date::date = $1::date
        ORDER BY event_date ASC
        LIMIT 20`,
      [date],
    ).catch(() => ({ rows: [] })),
  ]);

  return {
    date,
    classes: classesRes.rows,
    pending: pendingRes.rows,
    requests: requestsRes.rows,
    personal: [],
    events: eventsRes.rows,
  };
}

export interface ClassRequestMetrics {
  request_id: string;
  title: string;
  class_size: number;
  responses: number;
  yes: number;
  maybe: number;
  no: number;
  weighted_interest: number;
  weighted_pct: number;
  min_interest_pct: number;
  passed: boolean;
  rows: Array<{ roll_no: string; name: string; vote: string; voted_at: string }>;
}

export async function buildClassRequestMetrics(
  requestId: string,
): Promise<ClassRequestMetrics | null> {
  const { rows: reqRows } = await query<{
    id: string;
    title: string;
    class_id: string | null;
    min_interest_pct: string | null;
  }>(
    `SELECT id, title, class_id, min_interest_pct::text
       FROM public.class_requests WHERE id = $1::uuid LIMIT 1`,
    [requestId],
  );
  const req = reqRows[0];
  if (!req) return null;

  const { rows: sizeRows } = await query<{ cnt: string }>(
    req.class_id
      ? `SELECT COUNT(*)::text AS cnt FROM public.student_details WHERE department || '-' || semester || '-' || section = $1`
      : `SELECT COUNT(*)::text AS cnt FROM public.users WHERE role = 'student' AND deleted_at IS NULL`,
    req.class_id ? [req.class_id] : [],
  );
  const classSize = Math.max(1, parseInt(sizeRows[0]?.cnt ?? "1", 10));

  const { rows: voteRows } = await query<{
    roll_no: string;
    name: string;
    vote: "yes" | "maybe" | "no";
    voted_at: string;
  }>(
    `SELECT COALESCE(u.unique_id, '') AS roll_no,
            COALESCE(u.name, '') AS name,
            cri.vote,
            cri.voted_at::text
       FROM public.class_request_interest cri
       LEFT JOIN public.users u ON u.id = cri.student_id
      WHERE cri.request_id = $1::uuid
      ORDER BY cri.voted_at ASC`,
    [requestId],
  );

  let yes = 0;
  let maybe = 0;
  let no = 0;
  for (const v of voteRows) {
    if (v.vote === "yes") yes++;
    else if (v.vote === "maybe") maybe++;
    else no++;
  }

  const weightedInterest = yes + 0.5 * maybe;
  const weightedPct = Number(((weightedInterest / classSize) * 100).toFixed(1));
  const minPct = Number(req.min_interest_pct ?? 0.5) * 100;

  return {
    request_id: req.id,
    title: req.title,
    class_size: classSize,
    responses: voteRows.length,
    yes,
    maybe,
    no,
    weighted_interest: weightedInterest,
    weighted_pct: weightedPct,
    min_interest_pct: minPct,
    passed: weightedPct >= minPct,
    rows: voteRows,
  };
}
