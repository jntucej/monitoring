import { query } from "@/lib/postgres";

export async function refreshLeaderboards() {
  await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY public.class_leaderboards`);
}

export async function listForClass(
  classId: string,
  viewerId: string,
  viewerRole: string,
) {
  if (!["hod", "dean", "principal", "admin", "sysadmin"].includes(viewerRole)) {
    const { rows: vRows } = await query<{ class_id: string }>(
      `SELECT (department || '-' || semester || '-' || section) AS class_id
         FROM public.student_details WHERE user_id = $1::uuid LIMIT 1`,
      [viewerId],
    );
    if (vRows[0]?.class_id !== classId) {
      return { ok: false as const, status: 403, error: "cross_class_forbidden" };
    }
  }

  const { rows } = await query<{
    class_id: string;
    student_id: string;
    roll_no: string;
    full_name: string;
    department: string;
    attendance_pct: string;
    marks_pct: string;
    achievement_count: number;
  }>(
    `SELECT class_id, student_id, roll_no, full_name, department,
            attendance_pct::text, marks_pct::text, achievement_count
       FROM public.class_leaderboards
      WHERE class_id = $1
      ORDER BY attendance_pct DESC, marks_pct DESC, full_name ASC`,
    [classId],
  );

  return { ok: true as const, rows };
}
