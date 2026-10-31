import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function handleGet(req: NextRequest, _context: { auth: AuthContext }) {
  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const days = rangeParam === "90d" ? 90 : rangeParam === "30d" ? 30 : 7;

  const [totalsRes, decisionsRes, chartRes] = await Promise.all([
    // Totals over the range
    query<{
      approved: string;
      rejected: string;
      forwarded: string;
      escalated: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE p.status = 'APPROVED') AS approved,
         COUNT(*) FILTER (WHERE p.status = 'REJECTED') AS rejected,
         COUNT(*) FILTER (WHERE p.status = 'FORWARDED' OR p.forwarded_from_role IS NOT NULL) AS forwarded,
         COUNT(*) FILTER (WHERE p.status = 'ESCALATED') AS escalated
       FROM permissions p
       WHERE p.updated_at >= NOW() - ($1 || ' days')::interval`,
      [days.toString()]
    ).catch(() => ({
      rows: [{ approved: "0", rejected: "0", forwarded: "0", escalated: "0" }],
    })),

    // Decisions list
    query<{
      ticket: string;
      outcome: string;
      student: string | null;
      reason: string | null;
      workflow_type: string;
      decided_at: string;
    }>(
      `SELECT
         p.ticket_number AS ticket,
         p.status AS outcome,
         u.name AS student,
         COALESCE(p.reason, p.workflow_type) AS reason,
         p.workflow_type,
         p.updated_at AS decided_at
       FROM permissions p
       LEFT JOIN users u ON u.id = p.requester_user_id
       WHERE p.updated_at >= NOW() - ($1 || ' days')::interval
         AND p.status IN ('APPROVED', 'REJECTED', 'FORWARDED', 'ESCALATED')
       ORDER BY p.updated_at DESC
       LIMIT 100`,
      [days.toString()]
    ).catch(() => ({ rows: [] as any[] })),

    // Chart daily aggregate
    query<{
      decision_date: string;
      approved: string;
      rejected: string;
    }>(
      `SELECT
         TO_CHAR(p.updated_at, 'YYYY-MM-DD') AS decision_date,
         COUNT(*) FILTER (WHERE p.status = 'APPROVED')::text AS approved,
         COUNT(*) FILTER (WHERE p.status = 'REJECTED')::text AS rejected
       FROM permissions p
       WHERE p.updated_at >= NOW() - ($1 || ' days')::interval
         AND p.status IN ('APPROVED', 'REJECTED')
       GROUP BY TO_CHAR(p.updated_at, 'YYYY-MM-DD')`,
      [days.toString()]
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  const totalsRaw = totalsRes.rows[0] ?? {
    approved: "0",
    rejected: "0",
    forwarded: "0",
    escalated: "0",
  };

  const totals = {
    approved: Number(totalsRaw.approved) || 0,
    rejected: Number(totalsRaw.rejected) || 0,
    forwarded: Number(totalsRaw.forwarded) || 0,
    escalated: Number(totalsRaw.escalated) || 0,
  };

  const decisions = decisionsRes.rows.map((r) => ({
    ticket: r.ticket,
    outcome: r.outcome,
    student: r.student ?? "Student",
    reason: r.reason ?? r.workflow_type ?? "General Request",
    decidedAt: r.decided_at ? new Date(r.decided_at).toLocaleString() : "Recently",
    href: `/vice-principal/approvals/pending?ticket=${encodeURIComponent(r.ticket)}`,
  }));

  // Construct chart series for every calendar day in the range (fill empty days with 0)
  const chartMap = new Map<string, { approved: number; rejected: number }>();
  for (const row of chartRes.rows) {
    chartMap.set(row.decision_date, {
      approved: Number(row.approved) || 0,
      rejected: Number(row.rejected) || 0,
    });
  }

  const chart: Array<{ date: string; approved: number; rejected: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = formatDate(d);
    const existing = chartMap.get(dateStr);
    chart.push({
      date: dateStr,
      approved: existing ? existing.approved : 0,
      rejected: existing ? existing.rejected : 0,
    });
  }

  return ok({
    totals,
    decisions,
    chart,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["vice_principal", "principal", "admin", "sysadmin"],
});
