import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

type Status = "ok" | "warn" | "fail" | "unknown";

interface Check {
  id: string;
  label: string;
  status: Status;
  detail: string;
  runbook: string;
  batch: string;
}

function unknown(id: string, label: string, batch: string, e: unknown, runbook: string): Check {
  return { id, batch, label, status: "unknown", detail: String(e), runbook };
}

async function checkRlsForce(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
         AND c.relrowsecurity AND NOT c.relforcerowsecurity
    `);
    const gap = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "rls-force",
      batch: "H1",
      label: "RLS FORCE on all tables",
      status: gap === 0 ? "ok" : gap < 5 ? "warn" : "fail",
      detail: gap === 0 ? "every RLS table is FORCEd" : `${gap} table(s) missing FORCE`,
      runbook: "runbook.md#rls-force",
    };
  } catch (e) {
    return unknown("rls-force", "RLS FORCE", "H1", e, "runbook.md#rls-force");
  }
}

async function checkFailClosedGuc(): Promise<Check> {
  try {
    // A fail-OPEN gate policy grants rows when the GUC is NULL; in this
    // stack only policies that use a current_setting(...) IS NOT NULL
    // guard are acceptable for the gate_app role.
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM pg_policies
       WHERE schemaname = 'public'
         AND array_position(roles::text[], 'gate_app') IS NOT NULL
         AND qual IS NOT NULL
         AND qual !~* 'current_setting'
    `);
    const suspicious = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "guc-failclosed",
      batch: "H1",
      label: "Fail-closed GUC policies",
      status: suspicious === 0 ? "ok" : "warn",
      detail:
        suspicious === 0
          ? "all gate_app policies reference the GUC context"
          : `${suspicious} gate_app polic${suspicious === 1 ? "y" : "ies"} without a GUC guard`,
      runbook: "runbook.md#guc-failclosed",
    };
  } catch (e) {
    return unknown("guc-failclosed", "Fail-closed GUC", "H1", e, "runbook.md#guc-failclosed");
  }
}

async function checkAuditChain(): Promise<Check> {
  try {
    const { rows } = await query<{ broken: string }>(
      "SELECT count(*)::text AS broken FROM public.verify_audit_chain()"
    );
    const broken = parseInt(rows[0]?.broken ?? "0", 10);
    return {
      id: "audit-chain",
      batch: "H2",
      label: "Audit hash chain",
      status: broken === 0 ? "ok" : "fail",
      detail: broken === 0 ? "chain intact" : `${broken} broken row(s) — tamper suspected`,
      runbook: "runbook.md#audit-tamper",
    };
  } catch {
    // verify_audit_chain() is created by the audit-chain migration; if it
    // is not present yet the chain has never been initialised — that is
    // itself a failing state, not an unknown one.
    return {
      id: "audit-chain",
      batch: "H2",
      label: "Audit hash chain",
      status: "fail",
      detail: "verify_audit_chain() not available — chain not initialised",
      runbook: "runbook.md#audit-tamper",
    };
  }
}

async function checkAuditHead(): Promise<Check> {
  try {
    const { rows } = await query<{ at: string | null }>(`
      SELECT max(timestamp)::text AS at FROM public.audit_logs WHERE row_hash IS NOT NULL
    `);
    const at = rows[0]?.at;
    if (!at) {
      return {
        id: "audit-head",
        batch: "H2",
        label: "Audit head freshness",
        status: "fail",
        detail: "no chained audit rows",
        runbook: "runbook.md#audit-tamper",
      };
    }
    const hours = (Date.now() - new Date(at).getTime()) / 3_600_000;
    return {
      id: "audit-head",
      batch: "H2",
      label: "Audit head freshness",
      status: hours < 26 ? "ok" : hours < 48 ? "warn" : "fail",
      detail: `latest chained audit row ${hours.toFixed(1)}h old`,
      runbook: "runbook.md#audit-tamper",
    };
  } catch (e) {
    return unknown("audit-head", "Audit head", "H2", e, "runbook.md#audit-tamper");
  }
}

async function checkColdBackup(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM public.backups
       WHERE status = 'completed'
         AND created_at > NOW() - INTERVAL '26 hours'
    `);
    const n = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "cold-backup",
      batch: "I6",
      label: "Backup freshness (26h)",
      status: n > 0 ? "ok" : "fail",
      detail: n > 0 ? `${n} completed backup(s) in last 26h` : "no completed backup in 26h",
      runbook: "runbook.md#backup-freshness",
    };
  } catch (e) {
    return unknown("cold-backup", "Backup freshness", "I6", e, "runbook.md#backup-freshness");
  }
}

async function checkCronFreshness(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM public.worker_job_heartbeats
       WHERE last_run_at > NOW() - INTERVAL '2 hours'
    `);
    const n = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "cron-freshness",
      batch: "I7",
      label: "Worker heartbeats (2h)",
      status: n >= 3 ? "ok" : n > 0 ? "warn" : "fail",
      detail: `${n} job(s) ran in the last 2h`,
      runbook: "runbook.md#worker-stale",
    };
  } catch (e) {
    return unknown("cron-freshness", "Worker heartbeats", "I7", e, "runbook.md#worker-stale");
  }
}

async function checkLoginFailures(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM public.audit_logs
       WHERE action IN ('LOGIN_FAILED','PIN_LOGIN_FAILED')
         AND timestamp > NOW() - INTERVAL '1 hour'
    `);
    const n = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "login-failures",
      batch: "A",
      label: "Login failures (1h)",
      status: n < 50 ? "ok" : n < 200 ? "warn" : "fail",
      detail: `${n} in the last hour`,
      runbook: "runbook.md#login-failure-spike",
    };
  } catch (e) {
    return unknown("login-failures", "Login failures", "A", e, "runbook.md#login-failure-spike");
  }
}

async function checkRateLimitHits(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM public.api_metrics
       WHERE status_code = 429 AND timestamp > NOW() - INTERVAL '1 hour'
    `);
    const n = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "rate-limit",
      batch: "A",
      label: "Rate-limit hits (1h)",
      status: n < 500 ? "ok" : n < 5000 ? "warn" : "fail",
      detail: `${n} 429(s) in the last hour`,
      runbook: "runbook.md#rate-limit-storm",
    };
  } catch (e) {
    return unknown("rate-limit", "Rate-limit hits", "A", e, "runbook.md#rate-limit-storm");
  }
}

async function checkCsrfViolations(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM public.api_metrics
       WHERE csrf_result = 'fail'
         AND timestamp > NOW() - INTERVAL '24 hours'
    `);
    const n = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "csrf",
      batch: "I4",
      label: "CSRF rejections (24h)",
      status: n === 0 ? "ok" : n < 20 ? "ok" : n < 200 ? "warn" : "fail",
      detail: `${n} rejected in 24h`,
      runbook: "runbook.md#csrf-spike",
    };
  } catch (e) {
    return unknown("csrf", "CSRF rejections", "I4", e, "runbook.md#csrf-spike");
  }
}

async function checkAutomationKillSwitches(): Promise<Check> {
  try {
    const { rows } = await query<{ n: string }>(`
      SELECT count(*)::text AS n
        FROM public.automation_controls
       WHERE enabled = FALSE
    `);
    const off = parseInt(rows[0]?.n ?? "0", 10);
    return {
      id: "kill-switches",
      batch: "I5",
      label: "Automation kill switches",
      status: off === 0 ? "ok" : "warn",
      detail: off === 0 ? "all automation switches ON" : `${off} switch(es) currently OFF`,
      runbook: "runbook.md#security-incident-response",
    };
  } catch (e) {
    return unknown("kill-switches", "Automation kill switches", "I5", e, "runbook.md#security-incident-response");
  }
}

async function checkSloHealth(): Promise<Check> {
  try {
    const { rows } = await query<{ breaching: string; n: string }>(`
      SELECT count(*) FILTER (WHERE is_breaching)::text AS breaching,
             count(*)::text AS n
        FROM public.slo_snapshots s
       WHERE captured_at > NOW() - INTERVAL '30 minutes'
    `);
    const breaching = parseInt(rows[0]?.breaching ?? "0", 10);
    const n = parseInt(rows[0]?.n ?? "0", 10);
    if (n === 0) {
      return {
        id: "slo-snapshot",
        batch: "I3",
        label: "SLO snapshot freshness",
        status: "warn",
        detail: "no snapshot in the last 30 min (worker not yet running?)",
        runbook: "runbook.md#worker-stale",
      };
    }
    return {
      id: "slo-snapshot",
      batch: "I3",
      label: "SLO budget breach",
      status: breaching === 0 ? "ok" : "fail",
      detail: breaching === 0 ? `${n} snapshot(s), none breaching` : `${breaching} SLO(s) breaching target`,
      runbook: "runbook.md#slo-burn",
    };
  } catch (e) {
    return unknown("slo-snapshot", "SLO snapshot", "I3", e, "runbook.md#worker-stale");
  }
}

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const checks = await Promise.all([
    checkRlsForce(),
    checkFailClosedGuc(),
    checkAuditChain(),
    checkAuditHead(),
    checkColdBackup(),
    checkCronFreshness(),
    checkLoginFailures(),
    checkRateLimitHits(),
    checkCsrfViolations(),
    checkAutomationKillSwitches(),
    checkSloHealth(),
  ]);

  const score = checks.filter((c) => c.status === "ok").length / checks.length;

  const overall: Status = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "warn" || c.status === "unknown")
      ? "warn"
      : "ok";

  return ok({
    overall,
    score: Math.round(score * 100),
    generatedAt: new Date().toISOString(),
    checks,
  });
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
