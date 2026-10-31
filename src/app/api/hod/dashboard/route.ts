import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function relativeAge(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const deptId = auth.departmentId;
  if (!deptId) {
    return ok({
      empty: true,
      counts: { pending: 0, escalated: 0, overdue: 0, todayDecisions: 0 },
      priorityItems: [],
      faculty: { total: 0, presentToday: 0, lateToday: 0, absentToday: 0, needsAttention: 0 },
      students: { total: 0, onCampus: 0, offCampus: 0 },
      pulse: { myRate: 0, collegeAvg: 0, myRank: 0, totalDepts: 0 },
      schedule: [],
    });
  }

  const [countsRes, priorityRes, facultyRes, studentsRes, pulseRes, scheduleRes] =
    await Promise.all([
      // Approval counts for this department
      query<{
        pending: string;
        escalated: string;
        overdue: string;
        today_decisions: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE current_stage = 'hod' AND status = 'PENDING') AS pending,
           COUNT(*) FILTER (WHERE current_stage = 'hod' AND status = 'ESCALATED') AS escalated,
           COUNT(*) FILTER (
             WHERE current_stage = 'hod'
               AND status IN ('PENDING','ESCALATED')
               AND sla_deadline IS NOT NULL
               AND sla_deadline < NOW()
           ) AS overdue,
           COUNT(*) FILTER (
             WHERE current_stage = 'hod'
               AND status IN ('APPROVED','REJECTED')
               AND updated_at::date = CURRENT_DATE
           ) AS today_decisions
         FROM permissions p
         JOIN users u ON u.id = p.requester_user_id
         WHERE u.department_id = $1`,
        [deptId]
      ).catch(() => ({
        rows: [{ pending: "0", escalated: "0", overdue: "0", today_decisions: "0" }],
      })),

      // Top-priority approvals
      query<{
        id: string;
        ticket_number: string;
        workflow_type: string;
        reason: string | null;
        sla_deadline: string | null;
        created_at: string;
        student_name: string | null;
        impacted_count: string;
      }>(
        `SELECT p.id, p.ticket_number, p.workflow_type, p.reason, p.sla_deadline,
                p.created_at, u.name AS student_name,
                (SELECT COUNT(*) FROM users
                 WHERE department_id = $1 AND role = 'student' AND status = 'ACTIVE') AS impacted_count
           FROM permissions p
           JOIN users u ON u.id = p.requester_user_id
          WHERE u.department_id = $1
            AND p.current_stage = 'hod'
            AND p.status IN ('PENDING','ESCALATED')
          ORDER BY p.sla_deadline ASC NULLS LAST, p.created_at ASC
          LIMIT 20`,
        [deptId]
      ).catch(() => ({ rows: [] as any[] })),

      // Faculty needing attention
      query<{
        total: string;
        present_today: string;
        late_today: string;
        absent_today: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE u.status = 'ACTIVE') AS total,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM movement_logs ml
             WHERE ml.user_id = u.id
               AND ml.direction = 'IN'
               AND ml.timestamp::date = CURRENT_DATE
           )) AS present_today,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM movement_logs ml
             WHERE ml.user_id = u.id
               AND ml.direction = 'IN'
               AND ml.timestamp::date = CURRENT_DATE
               AND ml.timestamp::time > TIME '09:15'
           )) AS late_today,
           COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM movement_logs ml
             WHERE ml.user_id = u.id
               AND ml.direction = 'IN'
               AND ml.timestamp::date = CURRENT_DATE
           )) AS absent_today
         FROM users u
         WHERE u.department_id = $1
           AND u.role IN ('faculty','hod')
           AND u.status = 'ACTIVE'`,
        [deptId]
      ).catch(() => ({
        rows: [{ total: "0", present_today: "0", late_today: "0", absent_today: "0" }],
      })),

      // Student counts for the department
      query<{ total: string; on_campus: string; off_campus: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE u.status = 'ACTIVE') AS total,
           COUNT(*) FILTER (WHERE co.current_status = 'IN') AS on_campus,
           COUNT(*) FILTER (WHERE co.current_status = 'OUT') AS off_campus
         FROM users u
         LEFT JOIN campus_occupancy co ON co.user_id = u.id
         WHERE u.department_id = $1
           AND u.role = 'student'`,
        [deptId]
      ).catch(() => ({ rows: [{ total: "0", on_campus: "0", off_campus: "0" }] })),

      // Department ranking vs peers (today's attendance)
      query<{
        my_dept: string;
        my_rate: string;
        college_avg: string;
        my_rank: string;
        total_depts: string;
      }>(
        `WITH stats AS (
           SELECT u.department_id,
             ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM movement_logs ml
               WHERE ml.user_id = u.id
                 AND ml.direction = 'IN'
                 AND ml.timestamp::date = CURRENT_DATE
             )) / NULLIF(COUNT(*), 0), 1) AS rate
           FROM users u
           WHERE u.role IN ('student','faculty','hod')
             AND u.status = 'ACTIVE'
             AND u.department_id IS NOT NULL
           GROUP BY u.department_id
         ),
         ranked AS (
           SELECT department_id, rate,
                  RANK() OVER (ORDER BY rate DESC NULLS LAST) AS rnk,
                  ROUND(AVG(rate) OVER (), 1) AS avg_rate,
                  COUNT(*) OVER () AS total
           FROM stats
         )
         SELECT department_id AS my_dept, rate AS my_rate,
                avg_rate AS college_avg, rnk AS my_rank, total AS total_depts
           FROM ranked
          WHERE department_id = $1`,
        [deptId]
      ).catch(() => ({
        rows: [{ my_dept: deptId, my_rate: "0", college_avg: "0", my_rank: "0", total_depts: "0" }],
      })),

      // Today's class schedule
      query<{
        id: string;
        subject: string;
        section: string;
        room: string | null;
        starts_at: string;
        ends_at: string;
        marked: boolean;
      }>(
        `SELECT c.id, COALESCE(c.name, c.section) AS subject, c.section,
                c.room_number AS room,
                '09:00' AS starts_at,
                '10:00' AS ends_at,
                EXISTS (
                  SELECT 1 FROM attendance_records ar
                  WHERE ar.person_id = $1
                    AND ar.date = CURRENT_DATE
                    AND ar.meta->>'class_id' = c.id::text
                ) AS marked
           FROM classes c
           WHERE c.class_teacher_id = $1
             AND c.is_active = TRUE
           ORDER BY c.section`,
        [auth.userId]
      ).catch(() => ({ rows: [] as any[] })),
    ]);

  const c = countsRes.rows[0];
  const f = facultyRes.rows[0];
  const s = studentsRes.rows[0];
  const p = pulseRes.rows[0];
  const now = Date.now();

  return ok({
    counts: {
      pending: Number(c.pending),
      escalated: Number(c.escalated),
      overdue: Number(c.overdue),
      todayDecisions: Number(c.today_decisions),
    },
    priorityItems: priorityRes.rows.map((r) => ({
      id: r.id,
      ticket: r.ticket_number,
      subject: r.student_name
        ? `${r.student_name} · ${r.reason ?? r.workflow_type}`
        : `${r.ticket_number} · ${r.workflow_type}`,
      slaDeadline: r.sla_deadline,
      age: relativeAge(r.created_at, now),
      href: `/hod/approvals/pending?ticket=${encodeURIComponent(r.ticket_number)}`,
      impactedStudents: Number(r.impacted_count),
    })),
    faculty: {
      total: Number(f.total),
      presentToday: Number(f.present_today),
      lateToday: Number(f.late_today),
      absentToday: Number(f.absent_today),
      needsAttention: Number(f.absent_today) + Number(f.late_today),
    },
    students: {
      total: Number(s.total),
      onCampus: Number(s.on_campus),
      offCampus: Number(s.off_campus),
    },
    pulse: {
      myRate: Number(p.my_rate),
      collegeAvg: Number(p.college_avg),
      myRank: Number(p.my_rank),
      totalDepts: Number(p.total_depts),
    },
    schedule: scheduleRes.rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      section: r.section,
      room: r.room,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      marked: r.marked,
    })),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
});
