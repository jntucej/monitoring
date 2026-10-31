import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface DepartmentRow {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}

interface AbsentRow {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  department: string | null;
}

interface LateRow {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  department: string | null;
  minutesLate: number;
}

interface FlaggedRow {
  id: string;
  name: string;
  department: string | null;
  reason: string;
}

async function handleGet(_req: NextRequest, _context: { auth: AuthContext }) {
  const [deptStatsRes, exceptionsRes] = await Promise.all([
    // Department breakdown: joining departments with users, employee_details (for HOD), and movement_logs (for today's attendance)
    query<{
      code: string;
      name: string;
      hod_name: string | null;
      faculty: string;
      students: string;
      present: string;
      total_people: string;
    }>(
      `WITH dept_users AS (
         SELECT
           COALESCE(d.code, u.department_id) AS code,
           COALESCE(d.name, u.department_id) AS name,
           u.id,
           u.role,
           u.name AS user_name,
           ed.is_hod
         FROM users u
         LEFT JOIN departments d ON d.code = u.department_id
         LEFT JOIN employee_details ed ON ed.user_id = u.id
         WHERE u.status = 'ACTIVE'
           AND (u.department_id IS NOT NULL OR d.code IS NOT NULL)
       ),
       dept_attendance AS (
         SELECT
           du.code,
           COUNT(*) FILTER (WHERE du.role IN ('student')) AS students,
           COUNT(*) FILTER (WHERE du.role IN ('faculty', 'hod', 'teaching_faculty', 'assistant_professor', 'associate_professor', 'professor', 'staff')) AS faculty,
           COUNT(DISTINCT du.id) AS total_people,
           COUNT(DISTINCT du.id) FILTER (WHERE EXISTS (
             SELECT 1 FROM movement_logs ml
             WHERE ml.user_id = du.id
               AND ml.direction = 'IN'
               AND ml.timestamp::date = CURRENT_DATE
           )) AS present,
           (
             SELECT du_hod.user_name
             FROM dept_users du_hod
             WHERE du_hod.code = du.code
               AND (du_hod.is_hod = TRUE OR du_hod.role = 'hod')
             ORDER BY du_hod.is_hod DESC NULLS LAST
             LIMIT 1
           ) AS hod_name
         FROM dept_users du
         GROUP BY du.code
       )
       SELECT
         d.code,
         d.name,
         da.hod_name,
         COALESCE(da.faculty, 0)::text AS faculty,
         COALESCE(da.students, 0)::text AS students,
         COALESCE(da.present, 0)::text AS present,
         COALESCE(da.total_people, 0)::text AS total_people
       FROM departments d
       LEFT JOIN dept_attendance da ON da.code = d.code
       ORDER BY d.name ASC`
    ).catch(async () => {
      // Fallback: if departments table query fails or is empty, derive directly from users.department_id
      return query<{
        code: string;
        name: string;
        hod_name: string | null;
        faculty: string;
        students: string;
        present: string;
        total_people: string;
      }>(
        `SELECT
           u.department_id AS code,
           u.department_id AS name,
           NULL AS hod_name,
           COUNT(*) FILTER (WHERE u.role IN ('faculty', 'hod', 'staff'))::text AS faculty,
           COUNT(*) FILTER (WHERE u.role = 'student')::text AS students,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM movement_logs ml
             WHERE ml.user_id = u.id
               AND ml.direction = 'IN'
               AND ml.timestamp::date = CURRENT_DATE
           ))::text AS present,
           COUNT(*)::text AS total_people
         FROM users u
         WHERE u.status = 'ACTIVE' AND u.department_id IS NOT NULL
         GROUP BY u.department_id
         ORDER BY u.department_id ASC`
      ).catch(() => ({ rows: [] as any[] }));
    }),

    // Exceptions today: absent, late arrivals, flagged users
    query<{
      id: string;
      name: string;
      role: string;
      designation: string | null;
      department: string | null;
      flag_status: string | null;
      first_in_time: string | null;
      status: string;
    }>(
      `SELECT
         u.id,
         u.name,
         u.role,
         ed.designation,
         COALESCE(d.name, u.department_id) AS department,
         u.flag_status,
         (
           SELECT ml.timestamp
           FROM movement_logs ml
           WHERE ml.user_id = u.id
             AND ml.direction = 'IN'
             AND ml.timestamp::date = CURRENT_DATE
           ORDER BY ml.timestamp ASC
           LIMIT 1
         ) AS first_in_time,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM movement_logs ml
             WHERE ml.user_id = u.id
               AND ml.timestamp::date = CURRENT_DATE
           ) THEN 'PRESENT'
           ELSE 'ABSENT'
         END AS status
       FROM users u
       LEFT JOIN employee_details ed ON ed.user_id = u.id
       LEFT JOIN departments d ON d.code = u.department_id
       WHERE u.status = 'ACTIVE'
         AND u.role IN ('student', 'faculty', 'staff', 'hod')`
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  // Transform department stats
  const departments: DepartmentRow[] = deptStatsRes.rows.map((r) => {
    const faculty = Number(r.faculty) || 0;
    const students = Number(r.students) || 0;
    const present = Number(r.present) || 0;
    const totalPeople = Number(r.total_people) || 0;
    const ratio = faculty > 0 ? Math.round((students / faculty) * 10) / 10 : 0;
    const attendancePct = totalPeople > 0 ? Math.round((present / totalPeople) * 100) : 0;

    return {
      code: r.code,
      name: r.name,
      hodName: r.hod_name,
      faculty,
      students,
      ratio,
      attendancePct,
    };
  });

  const totalDepts = departments.length;
  const totalStudents = departments.reduce((acc, d) => acc + d.students, 0);
  const totalFaculty = departments.reduce((acc, d) => acc + d.faculty, 0);
  const avgAttendance =
    totalDepts > 0
      ? Math.round(departments.reduce((acc, d) => acc + d.attendancePct, 0) / totalDepts)
      : 0;

  // Process exceptions
  const absent: AbsentRow[] = [];
  const late: LateRow[] = [];
  const flagged: FlaggedRow[] = [];

  for (const row of exceptionsRes.rows) {
    if (row.flag_status) {
      flagged.push({
        id: row.id,
        name: row.name,
        department: row.department,
        reason: row.flag_status,
      });
    }

    if (row.status === "ABSENT") {
      absent.push({
        id: row.id,
        name: row.name,
        role: row.role,
        designation: row.designation,
        department: row.department,
      });
    }

    if (row.first_in_time) {
      const inDate = new Date(row.first_in_time);
      const hours = inDate.getHours();
      const minutes = inDate.getMinutes();
      // Cutoff: 09:00 AM
      if (hours > 9 || (hours === 9 && minutes > 0)) {
        const minutesLate = (hours - 9) * 60 + minutes;
        late.push({
          id: row.id,
          name: row.name,
          role: row.role,
          designation: row.designation,
          department: row.department,
          minutesLate,
        });
      }
    }
  }

  return ok({
    departments,
    summary: {
      totalDepts,
      totalStudents,
      totalFaculty,
      avgAttendance,
    },
    exceptions: {
      absent,
      late,
      flagged,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["vice_principal", "principal", "admin", "sysadmin"],
});
