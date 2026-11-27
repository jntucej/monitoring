import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { AREA_ADAPTERS, type AreaId, type AreaAdapter } from "@/lib/org-map-adapters";

function defaultAreaForRole(role: string): AreaId {
  switch (role) {
    case "hod":
    case "faculty":
    case "class_advisor":
      return "department";
    case "supervisor":
    case "operator":
    case "security":
      return "security";
    case "hostel_manager":
    case "deputy_warden":
    case "caretaker":
    case "warden":
    case "vice_principal":
      return "hostel";
    case "oie":
    case "exam_branch":
    case "chief_superintendent":
      return "exam";
    default:
      return "institutional";
  }
}

async function handleGet(req: NextRequest, context?: { auth: AuthContext }) {
  const auth = context?.auth;
  const role = auth?.role ?? "principal";
  const rawArea = req.nextUrl.searchParams.get("area") as AreaId | null;
  const areaId: AreaId = rawArea && rawArea in AREA_ADAPTERS ? rawArea : defaultAreaForRole(role);

  const base = AREA_ADAPTERS[areaId];
  const isSuperAdmin = role === "sysadmin" || (role as string) === "super_admin";
  const vpPrivacyEnforced = role === "vice_principal" && areaId === "hostel";

  // Hydrate live telemetry from PostgreSQL (graceful fallback if any table is empty/absent)
  const [staffRes, pendingRes, delegationRes, gateRes] = await Promise.all([
    query<{ total: string; active: string }>(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active FROM users WHERE role != 'student'`
    ).catch(() => ({ rows: [{ total: "0", active: "0" }] })),
    query<{ pending: string; escalated: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
         COUNT(*) FILTER (WHERE status = 'ESCALATED') AS escalated
       FROM permissions`
    ).catch(() => ({ rows: [{ pending: "0", escalated: "0" }] })),
    query<{ active: string }>(
      `SELECT COUNT(*) AS active FROM delegations WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`
    ).catch(() => ({ rows: [{ active: "0" }] })),
    query<{ total: string; active: string }>(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active = true) AS active FROM gates`
    ).catch(() => ({ rows: [{ total: "0", active: "0" }] })),
  ]);

  const staffTotal = Number(staffRes.rows[0]?.total ?? 0);
  const staffActive = Number(staffRes.rows[0]?.active ?? 0);
  const pendingCount = Number(pendingRes.rows[0]?.pending ?? 0);
  const escalatedCount = Number(pendingRes.rows[0]?.escalated ?? 0);
  const activeDelegations = Number(delegationRes.rows[0]?.active ?? 0);
  const gatesActive = Number(gateRes.rows[0]?.active ?? 0);
  const gatesTotal = Number(gateRes.rows[0]?.total ?? 0);

  // Clone adapter and overlay live DB metrics where non-zero
  const kpis = base.kpis.map((kpi, idx) => {
    if (areaId === "institutional") {
      if (idx === 0 && staffTotal > 0) {
        const pct = Math.round((staffActive / staffTotal) * 1000) / 10;
        return { ...kpi, value: String(staffActive), delta: `${pct}% active`, sub: `Total staff: ${staffTotal}` };
      }
      if (idx === 2 && activeDelegations >= 0) {
        return { ...kpi, value: String(activeDelegations) };
      }
      if (idx === 3 && (pendingCount > 0 || escalatedCount > 0)) {
        return { ...kpi, value: String(escalatedCount), delta: `${pendingCount} pending` };
      }
    }
    if (areaId === "security" && idx === 0 && gatesTotal > 0) {
      return { ...kpi, value: `${gatesActive}/${gatesTotal}`, sub: "Live gate checkpoints" };
    }
    return kpi;
  });

  const nodes = base.nodes.map((n) => {
    const sanitized = isSuperAdmin ? n : { ...n, uuid: "redacted" };
    if (vpPrivacyEnforced && sanitized.tier >= 2) {
      return {
        ...sanitized,
        name: `Aggregate Unit (${sanitized.code})`,
        initials: "AG",
        statusText: "VP Privacy Boundary · Aggregate Only",
        todaySchedule: ["Individual resident/warden PII masked for vice_principal"],
      };
    }
    return sanitized;
  });

  const adapter: AreaAdapter = {
    ...base,
    kpis,
    nodes,
  };

  return ok({
    areaId,
    role,
    isSuperAdmin,
    vpPrivacyEnforced,
    adapter,
    liveTelemetry: {
      staffActive,
      staffTotal,
      pendingCount,
      escalatedCount,
      activeDelegations,
      gatesActive,
      gatesTotal,
    },
  });
}

export const GET = withAuthorization(handleGet);
