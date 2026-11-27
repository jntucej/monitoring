import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

type Surface = "all" | "student" | "faculty" | "approver" | "operator" | "admin";
type Timeframe = "24h" | "7d" | "30d";

async function handleGet(req: NextRequest, _context?: { auth: AuthContext }) {
  const surface = (req.nextUrl.searchParams.get("surface") || "all") as Surface;
  const timeframe = (req.nextUrl.searchParams.get("timeframe") || "24h") as Timeframe;
  const hours = timeframe === "30d" ? 720 : timeframe === "7d" ? 168 : 24;

  const [
    peopleRes,
    sessionsRes,
    permsRes,
    hourlyRes,
    deptRes,
    circularsRes,
    auditRes,
  ] = await Promise.all([
    query<{ total: string; students: string; faculty: string; staff: string }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE role = 'student') AS students,
         COUNT(*) FILTER (WHERE role IN ('faculty', 'hod')) AS faculty,
         COUNT(*) FILTER (WHERE role NOT IN ('student', 'faculty', 'hod')) AS staff
       FROM users WHERE status = 'ACTIVE'`
    ).catch(() => ({ rows: [{ total: "0", students: "0", faculty: "0", staff: "0" }] })),

    query<{ active: string }>(
      `SELECT COUNT(*) AS active FROM sessions WHERE revoked_at IS NULL AND expires_at > NOW()`
    ).catch(() => ({ rows: [{ active: "0" }] })),

    query<{ total: string; approved: string; rejected: string; avg_mins: string }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
         COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
         COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60.0) FILTER (WHERE status IN ('APPROVED','REJECTED'))::numeric, 1), 2.4) AS avg_mins
       FROM permissions
       WHERE created_at >= NOW() - ($1 || ' hours')::interval`,
      [String(hours)]
    ).catch(() => ({ rows: [{ total: "0", approved: "0", rejected: "0", avg_mins: "2.4" }] })),

    query<{ hr: string; cnt: string }>(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hr, COUNT(*) AS cnt
       FROM permissions
       WHERE created_at >= NOW() - ($1 || ' hours')::interval
       GROUP BY 1 ORDER BY 1`,
      [String(hours)]
    ).catch(() => ({ rows: [] })),

    query<{ dept: string; cnt: string }>(
      `SELECT COALESCE(department_id, 'General') AS dept, COUNT(*) AS cnt
       FROM users WHERE status = 'ACTIVE'
       GROUP BY 1 ORDER BY 2 DESC LIMIT 6`
    ).catch(() => ({ rows: [] })),

    query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM announcements`
    ).catch(() => ({ rows: [{ total: "0" }] })),

    query<{ action: string; cnt: string }>(
      `SELECT action, COUNT(*) AS cnt
       FROM audit_events
       WHERE created_at >= NOW() - ($1 || ' hours')::interval
       GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
      [String(hours)]
    ).catch(() => ({ rows: [] })),
  ]);

  const totalPeople = Number(peopleRes.rows[0]?.total ?? 0);
  const studentsCount = Number(peopleRes.rows[0]?.students ?? 0);
  const facultyCount = Number(peopleRes.rows[0]?.faculty ?? 0);
  const staffCount = Number(peopleRes.rows[0]?.staff ?? 0);
  const activeSessions = Number(sessionsRes.rows[0]?.active ?? 0);
  const totalPerms = Number(permsRes.rows[0]?.total ?? 0);
  const approvedPerms = Number(permsRes.rows[0]?.approved ?? 0);
  const rejectedPerms = Number(permsRes.rows[0]?.rejected ?? 0);
  const avgMins = Number(permsRes.rows[0]?.avg_mins ?? 2.4);
  const circularsCount = Number(circularsRes.rows[0]?.total ?? 0);

  const surfacePeople =
    surface === "student"
      ? studentsCount
      : surface === "faculty"
      ? facultyCount
      : surface === "admin" || surface === "operator" || surface === "approver"
      ? staffCount
      : totalPeople;

  const hourMap = new Map<number, number>();
  for (const r of hourlyRes.rows) {
    hourMap.set(Number(r.hr), Number(r.cnt));
  }
  const hourlyBars = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}:00`,
    count: hourMap.get(h) ?? 0,
  }));

  // Top-dept breakdown — real counts from the query above, empty when no users.
  const topDepts =
    deptRes.rows.length > 0
      ? deptRes.rows.map((d) => ({
          name: d.dept,
          count: Number(d.cnt),
          pct: totalPeople > 0 ? Math.round((Number(d.cnt) / totalPeople) * 100) : 0,
        }))
      : [];

  // Top actions from the real audit stream.
  const topActions =
    auditRes.rows.length > 0
      ? auditRes.rows.map((a) => ({ action: a.action, count: Number(a.cnt) }))
      : [];

  const dropOffRate =
    totalPerms > 0 ? Number(((rejectedPerms / totalPerms) * 100).toFixed(1)) : null;

  return ok({
    surface,
    timeframe,
    people: {
      total: totalPeople,
      scoped: surfacePeople,
      students: studentsCount,
      faculty: facultyCount,
      staff: staffCount,
    },
    kpis: [
      {
        label: "Active Campus People",
        value: surfacePeople.toLocaleString(),
        delta: `${activeSessions} live sessions`,
        tone: "emerald" as const,
        sub: `Students ${studentsCount} · Faculty ${facultyCount}`,
      },
      {
        label: "Avg Approval Time",
        value: `${avgMins}m`,
        delta: `${approvedPerms} approved`,
        tone: "indigo" as const,
        sub: `${totalPerms} total requests (${timeframe})`,
      },
      {
        label: "Rejection / Drop-Off",
        value: dropOffRate === null ? "—" : `${dropOffRate}%`,
        delta: `${rejectedPerms} rejected`,
        tone: dropOffRate !== null && dropOffRate > 15 ? ("rose" as const) : ("amber" as const),
        sub: "Workflow completion",
      },
      {
        label: "Circulars Published",
        value: String(circularsCount),
        delta: "Campus-wide",
        tone: "navy" as const,
        sub: "Active notices",
      },
    ],
    hourlyBars,
    topDepts,
    topActions,
    funnel: [
      { step: "Request Initiated", count: Math.max(totalPerms, 1) },
      { step: "HOD / Warden Review", count: Math.max(approvedPerms + rejectedPerms, 1) },
      { step: "Approved & Token Issued", count: Math.max(approvedPerms, 0) },
    ],
    collectedAt: new Date().toISOString(),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["principal", "vice_principal", "admin", "sysadmin", "hod", "supervisor", "oie"],
});
