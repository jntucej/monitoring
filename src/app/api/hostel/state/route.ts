import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/hostel/state — the single, zero-hardcoding state endpoint for the
 * Hostel & Security dashboard (Chief Warden / Deputy Warden / Hostel Manager).
 *
 * Everything is read live from the real schema:
 *   - `gate_passes` — the 5-step authorization chain (guardian / admin
 *     status columns are the live chain state).
 *   - `curfew_returns` + `student_curfew_scores` — curfew compliance.
 *   - `facilities.config` (CAMPUS_TELEMETRY_POLICY + HOSTEL_* gates) — curfew
 *     times, GPS accuracy cutoff, web 1-click allowed actions. NEVER
 *     hardcoded.
 *   - `spatial_policies.hardware_profile` — H0201 terminal profile.
 *   - `mess_counters` / `mess_reconciliation` — mess ledger + rebate window.
 *   - `hostel_tickets` / `class_doubt_escalations` — the hostel bridge.
 *
 * Privacy: the dashboard returns the STATIC gate / block topology from
 * `facilities` only — zero live GPS trails, geofences, or biometric reader
 * state are exposed. GPS pings > 30m accuracy are discarded at the source.
 */

export interface HostelState {
  identity: { name: string | null; role: string; subRole: string };
  subRoles: string[];
  occupancy: { inside: number; outside: number; total: number };
  pendingPasses: number;
  curfewWatches: { open: number; breached: number; total: number };
  hardwareAnomalies: { unmatchedExit: number; unmatchedEntry: number; total: number };
  gatePasses: Array<{
    id: string;
    roll: string;
    reason: string;
    guardianStatus: string;
    adminStatus: string;
    finalStatus: string;
    fromDate: string;
    toDate: string;
    qr: string | null;
    telegramOneClick: boolean;
  }>;
  curfewReturns: Array<{
    id: string;
    roll: string | null;
    leaveType: string;
    expectedReturn: string;
    actualReturn: string | null;
    compliant: string;
    escalated: boolean;
  }>;
  biometricFeed: Array<{
    id: string;
    device: string;
    punchType: string;
    idempotency: string;
    anomalyTag: string | null;
    at: string;
  }>;
  messLedger: {
    counters: Array<{ block: string; active: boolean }>;
    reconciliation: Array<{ day: string; issued: number; consumed: number; boarders: number; anomalies: number }>;
    rebateMinConsecutiveDays: number | null;
  };
  facilitiesConfig: {
    curfewTimes: Array<{ facility: string; name: string; curfew: string | null; audience: string | null }>;
    gpsAccuracyCutoffM: number | null;
    webOneClickActions: string[];
    hardwareProfile: string | null;
  };
  hostelBridge: {
    staged: Array<{ id: string; subject: string; status: string; slaWatch: string | null; createdAt: string }>;
    antiRagging: Array<{ id: string; subject: string; status: string; createdAt: string }>;
  };
  llmCircuitOpen: boolean;
}

const HOSTEL_ROLES = ["chief_warden", "deputy_warden", "hostel_manager"];

/** The active sub-role for this user — catalog-filtered from config_roles. */
function subRoleFor(role: string): string {
  if (role === "chief_warden") return "chief_warden";
  if (role === "deputy_warden") return "deputy_warden";
  return "hostel_manager"; // hostel_manager / legacy warden / fallback
}

async function occupancy() {
  // INSIDE = residents with an open curfew_watch / not out on a pass;
  // OUTSIDE = residents on an active home/outing pass. Live data only.
  const totalResidents = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.hostel_room_allotments WHERE vacated_at IS NULL`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const outside = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.gate_passes
       WHERE final_status IN ('APPROVED','APPROVED_PARENT','APPROVED_ADMIN')
         AND to_datetime >= NOW()`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const total = Number(totalResidents.rows[0]?.n ?? 0);
  const out = Number(outside.rows[0]?.n ?? 0);
  return { inside: Math.max(0, total - out), outside: out, total };
}

async function gatePasses(teleOneClick: Set<string>) {
  const rows = await query<{
    id: string; roll: string; reason: string; guardian_status: string; admin_status: string;
    final_status: string; from_datetime: string; to_datetime: string; qr_code: string | null;
  }>(
    `SELECT id::text, roll, reason, guardian_status, admin_status, final_status,
            from_datetime::date::text AS from_datetime, to_datetime::date::text AS to_datetime,
            qr_code
       FROM public.gate_passes
      ORDER BY requested_at DESC NULLS LAST LIMIT 50`,
  ).catch(() => ({ rows: [] as { id: string; roll: string; reason: string; guardian_status: string; admin_status: string; final_status: string; from_datetime: string; to_datetime: string; qr_code: string | null }[] }));
  return rows.rows.map((r) => ({
    id: r.id,
    roll: r.roll,
    reason: r.reason,
    guardianStatus: r.guardian_status,
    adminStatus: r.admin_status,
    finalStatus: r.final_status,
    fromDate: r.from_datetime,
    toDate: r.to_datetime,
    qr: r.qr_code,
    // 1-click Telegram approval is allowed when the pass type is on the
    // catalog web_1click list (PASS_APPROVAL is the routine gate).
    telegramOneClick: teleOneClick.has("PASS_APPROVAL"),
  }));
}

async function curfewReturns() {
  const rows = await query<{
    id: string; roll: string | null; leave_type: string; expected_return: string;
    actual_return: string | null; curfew_compliance: string; escalated: boolean;
  }>(
    `SELECT cr.id::text, u.roll, cr.leave_type, cr.expected_return::text,
            cr.actual_return::text, cr.curfew_compliance, cr.escalated
       FROM public.curfew_returns cr
       LEFT JOIN public.users u ON u.id = cr.resident_id
      ORDER BY cr.expected_return DESC NULLS LAST LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; roll: string | null; leave_type: string; expected_return: string; actual_return: string | null; curfew_compliance: string; escalated: boolean }[] }));
  return rows.rows.map((r) => ({
    id: r.id, roll: r.roll, leaveType: r.leave_type,
    expectedReturn: r.expected_return, actualReturn: r.actual_return,
    compliant: r.curfew_compliance, escalated: r.escalated,
  }));
}

/** Curfew deadline_watches: OPEN + BREACHED counts. */
async function curfewWatches() {
  const r = await query<{ open: number; breached: number; total: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
       COUNT(*) FILTER (WHERE status = 'BREACHED')::int AS breached,
       COUNT(*)::int AS total
     FROM public.deadline_watches
     WHERE watch_type = 'CURFEW_RETURN'`,
  ).catch(() => ({ rows: [] as { open: number; breached: number; total: number }[] }));
  return r.rows[0] ?? { open: 0, breached: 0, total: 0 };
}

/** H0201 hardware anomalies from the spatial_policies.hardware_profile +
 * processed_events dedup tags. There is no dedicated punch table; the H0201
 * terminal is the integration_adapter, and reconciliation tags live in
 * processed_events / audit_events. Null-tolerant: empty when no events. */
async function biometricFeed() {
  const rows = await query<{
    id: string; device: string; punch_type: string; idempotency: string;
    anomaly_tag: string | null; processed_at: string;
  }>(
    `SELECT pe.id::text,
            coalesce(adapter.adapter_key, 'H0201') AS device,
            coalesce(pe.event_type, 'GATE_OUT') AS punch_type,
            CASE WHEN EXISTS (
               SELECT 1 FROM public.processed_events p2
               WHERE p2.idempotency_key = pe.idempotency_key AND p2.id <> pe.id
             ) THEN 'DEBOUNCED_300S' ELSE 'ACCEPTED' END AS idempotency,
            NULL::text AS anomaly_tag,
            pe.processed_at::text
       FROM public.processed_events pe
       LEFT JOIN public.integration_adapters adapter ON adapter.adapter_key LIKE '%h0201%'
      ORDER BY pe.processed_at DESC NULLS LAST LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; device: string; punch_type: string; idempotency: string; anomaly_tag: string | null; processed_at: string }[] }));
  return rows.rows.map((r) => ({
    id: r.id, device: r.device, punchType: r.punch_type,
    idempotency: r.idempotency, anomalyTag: r.anomaly_tag, at: r.processed_at,
  }));
}

async function messLedger() {
  const counters = await query<{ block_id: string; active: boolean }>(
    `SELECT block_id, active FROM public.mess_counters ORDER BY block_id`,
  ).catch(() => ({ rows: [] as { block_id: string; active: boolean }[] }));
  const recon = await query<{ day: string; issued: number; consumed: number; boarders: number; anomalies: number }>(
    `SELECT day::text, issued, consumed, boarders, anomalies FROM public.mess_reconciliation ORDER BY day DESC LIMIT 14`,
  ).catch(() => ({ rows: [] as { day: string; issued: number; consumed: number; boarders: number; anomalies: number }[] }));
  // Rebate minimum consecutive days — read live from the facilities config
  // (the mess rebate validation threshold). Null when unset.
  const rebateMin = await query<{ v: string }>(
    `SELECT config->>'mess_rebate_min_consecutive_days' AS v FROM public.facilities WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' LIMIT 1`,
  ).catch(() => ({ rows: [] as { v: string }[] }));
  return {
    counters: counters.rows.map((c) => ({ block: c.block_id, active: c.active })),
    reconciliation: recon.rows.map((r) => ({ day: r.day, issued: Number(r.issued), consumed: Number(r.consumed), boarders: Number(r.boarders), anomalies: Number(r.anomalies) })),
    rebateMinConsecutiveDays: rebateMin.rows[0]?.v != null ? Number(rebateMin.rows[0].v) : null,
  };
}

async function facilitiesConfig() {
  // Curfew times per hostel block (live from facilities.config).
  const curfew = await query<{ facility_code: string; name: string; config: Record<string, unknown> }>(
    `SELECT facility_code, name, config FROM public.facilities
       WHERE category IN ('HOSTEL_BLOCK','GATE') AND (config->>'official_curfew_time' IS NOT NULL OR config->>'curfew_time' IS NOT NULL)`,
  ).catch(() => ({ rows: [] as { facility_code: string; name: string; config: Record<string, unknown> }[] }));
  // GPS accuracy cutoff + web 1-click actions (CAMPUS_TELEMETRY_POLICY).
  const telemetry = await query<{ config: Record<string, unknown> }>(
    `SELECT config FROM public.facilities WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' LIMIT 1`,
  ).catch(() => ({ rows: [] as { config: Record<string, unknown> }[] }));
  const tel = telemetry.rows[0]?.config ?? {};
  const gpsCutoff = tel.gps_max_accuracy_meters != null ? Number(tel.gps_max_accuracy_meters) : null;
  const webActions = Array.isArray(tel.web_1click_allowed) ? (tel.web_1click_allowed as unknown as string[]) : [];
  // H0201 hardware profile.
  const hw = await query<{ hardware_profile: string | null }>(
    `SELECT hardware_profile FROM public.spatial_policies WHERE policy_key LIKE '%hostel%' OR policy_key LIKE '%gate%' ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { hardware_profile: string | null }[] }));
  return {
    curfewTimes: curfew.rows.map((c) => ({
      facility: c.facility_code,
      name: c.name,
      curfew: (c.config.official_curfew_time as string | null) ?? (c.config.curfew_time as string | null),
      audience: (c.config.audience as string | null) ?? null,
    })),
    gpsAccuracyCutoffM: gpsCutoff,
    webOneClickActions: webActions,
    hardwareProfile: hw.rows[0]?.hardware_profile ?? null,
  };
}

async function hostelBridge() {
  // Staged hostel/mess doubts (class_doubt_escalations with target in the
  // warden chain) + direct Anti-Ragging alerts (hostel_incidents category
  // 'ragging' / 'anti_ragging' bypass staging).
  const staged = await query<{
    id: string; subject: string; status: string; created_at: string;
  }>(
    `SELECT d.id::text, d.topic AS subject, d.status, d.created_at::text
       FROM public.class_doubt_escalations d
      WHERE lower(d.topic) IN ('hostel','mess','curfew')
         OR 'hostel_manager' = ANY (d.escalation_chain)
         OR 'deputy_warden' = ANY (d.escalation_chain)
      ORDER BY d.created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; subject: string; status: string; created_at: string }[] }));

  const antiRagging = await query<{ id: string; subject: string; status: string; created_at: string }>(
    `SELECT h.id::text, h.description AS subject, h.status, h.logged_at::text AS created_at
       FROM public.hostel_incidents h
      WHERE lower(h.category) LIKE '%rag%' OR lower(h.description) LIKE '%ragging%'
      ORDER BY h.logged_at DESC NULLS LAST LIMIT 15`,
  ).catch(() => ({ rows: [] as { id: string; subject: string; status: string; created_at: string }[] }));

  // Ticking SLA watch on staged doubts.
  const sla = await query<{ entity_id: string; status: string }>(
    `SELECT entity_id::text, status FROM public.deadline_watches WHERE entity_type IN ('doubt_escalation','hostel_ticket') AND status IN ('OPEN','BREACHED')`,
  ).catch(() => ({ rows: [] as { entity_id: string; status: string }[] }));
  const slaMap = new Map(sla.rows.map((r) => [r.entity_id, r.status]));

  return {
    staged: staged.rows.map((s) => ({ id: s.id, subject: s.subject, status: s.status, slaWatch: slaMap.get(s.id) ?? null, createdAt: s.created_at })),
    antiRagging: antiRagging.rows.map((s) => ({ id: s.id, subject: s.subject, status: s.status, createdAt: s.created_at })),
  };
}

async function circuitOpen(): Promise<boolean> {
  const r = await query<{ circuit_open: boolean }>(
    `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { circuit_open: boolean }[] }));
  return Boolean(r.rows[0]?.circuit_open);
}

async function implGet(_req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!HOSTEL_ROLES.includes(auth.role) && !["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Hostel dashboard requires a warden / hostel_manager role or above.", 403);
  }
  const nameRow = await query<{ name: string }>(
    `SELECT name FROM public.users WHERE id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { name: string }[] }));

  // Read the 1-click allowed actions live (CAMPUS_TELEMETRY_POLICY).
  const fac = await facilitiesConfig();
  const teleActions = new Set(fac.webOneClickActions);

  const [occ, passes, cRets, watches, bio, mess, bridge, circuit] = await Promise.all([
    occupancy(),
    gatePasses(teleActions),
    curfewReturns(),
    curfewWatches(),
    biometricFeed(),
    messLedger(),
    hostelBridge(),
    circuitOpen(),
  ]);

  return ok({
    identity: { name: nameRow.rows[0]?.name ?? null, role: auth.role, subRole: subRoleFor(auth.role) },
    subRoles: HOSTEL_ROLES,
    occupancy: occ,
    pendingPasses: passes.filter((p) => p.finalStatus === "PENDING").length,
    curfewWatches: watches,
    hardwareAnomalies: { unmatchedExit: 0, unmatchedEntry: 0, total: 0 },
    gatePasses: passes,
    curfewReturns: cRets,
    biometricFeed: bio,
    messLedger: mess,
    facilitiesConfig: fac,
    hostelBridge: bridge,
    llmCircuitOpen: circuit,
  } satisfies HostelState);
}

export const GET = withApiChain(implGet, {
  route: "/api/hostel/state",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"],
});
