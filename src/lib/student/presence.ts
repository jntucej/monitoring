import { query } from "@/lib/postgres";

export type PresenceState = "in_hostel" | "on_campus" | "out" | "on_leave" | "unknown";

export interface StudentPresence {
  student_id: string;
  state: PresenceState;
  since: string;
  block_id: string | null;
  last_scan_id: string | null;
  last_scan_at: string | null;
  active_leave_id: string | null;
  updated_at: string;
}

export async function getPresence(studentId: string): Promise<StudentPresence | null> {
  const { rows } = await query<StudentPresence>(
    `SELECT student_id, state, since::text, block_id, last_scan_id,
            last_scan_at::text, active_leave_id, updated_at::text
       FROM public.student_presence
      WHERE student_id = $1::uuid
      LIMIT 1`,
    [studentId],
  );
  return rows[0] ?? null;
}
