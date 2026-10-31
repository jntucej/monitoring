import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const deptId = auth.departmentId;
  if (!deptId) {
    return ok({
      myDept: "",
      myRate: 0,
      collegeAvg: 0,
      myRank: 0,
      totalDepts: 0,
    });
  }

  const { rows } = await query<{
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
  }));

  const p = rows[0] ?? {
    my_dept: deptId,
    my_rate: "0",
    college_avg: "0",
    my_rank: "0",
    total_depts: "0",
  };

  return ok({
    myDept: p.my_dept,
    myRate: Number(p.my_rate),
    collegeAvg: Number(p.college_avg),
    myRank: Number(p.my_rank),
    totalDepts: Number(p.total_depts),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["hod", "faculty", "principal", "admin", "sysadmin"],
});
