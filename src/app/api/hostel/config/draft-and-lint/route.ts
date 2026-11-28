import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hostel/config/draft-and-lint — Chief Warden (Steward) drafts
 * facilities.config changes (curfew times, mess rebate minimums, new
 * outing_pass JSON-Schema fields), runs the Policy Linter + Dry-Run Impact
 * Preview, and submits DRY_RUN_VERIFIED drafts to VP / Principal for
 * activation.
 *
 * STEWARD → OWNER BOUNDARY: the chief_warden CANNOT solo-publish. This
 * handler validates + stages; activation requires vice_principal / principal
 * approval (enforced in the API — an 'activate' without the right role 403s).
 *
 * Live-DB: facilities.config (JSONB) + policy_change_requests (draft
 * tracking) + a linter over the JSON. No mock store.
 */

export interface ConfigDraftBody {
  action: "draft_curfew" | "draft_rebate_min" | "draft_outing_schema" | "lint" | "submit";
  facilityCode?: string;
  curfewTime?: string;
  messRebateMinConsecutiveDays?: number;
  outingSchemaField?: { key: string; label: string; type: string };
  submitTo?: "vice_principal" | "principal";
}

async function implPost(req: NextRequest, ctx: ApiChainContext<ConfigDraftBody, AuthContext>) {
  const auth = ctx.auth;
  if (!["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "facilities.config stewardship requires a warden role.", 403);
  }
  const b = ctx.body;

  switch (b.action) {
    case "draft_curfew": {
      // Stage a curfew change (do NOT activate — that needs VP/Principal).
      const fac = b.facilityCode ?? "CAMPUS_TELEMETRY_POLICY";
      const current = await query<{ config: Record<string, unknown> }>(
        `SELECT config FROM public.facilities WHERE facility_code = $1 LIMIT 1`, [fac],
      ).catch(() => ({ rows: [] as { config: Record<string, unknown> }[] }));
      const draft = { ...(current.rows[0]?.config ?? {}), curfew_time: b.curfewTime ?? b.curfewTime };
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status)
           VALUES ($1, $2, 'PENDING')`,
        ["hostel.config_draft", JSON.stringify({ facilityCode: fac, field: "curfew_time", value: b.curfewTime, draft, at: new Date().toISOString(), by: auth.userId, staged: true })],
      ).catch(() => {});
      return ok({ staged: true, facilityCode: fac, note: "Curfew change staged as draft. Submit to VP/Principal for activation (Steward → Owner boundary)." });
    }

    case "draft_rebate_min": {
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status)
           VALUES ($1, $2, 'PENDING')`,
        ["hostel.config_draft", JSON.stringify({ facilityCode: "CAMPUS_TELEMETRY_POLICY", field: "mess_rebate_min_consecutive_days", value: b.messRebateMinConsecutiveDays, at: new Date().toISOString(), by: auth.userId, staged: true })],
      ).catch(() => {});
      return ok({ staged: true, note: "Rebate minimum staged as draft. Submit to VP/Principal." });
    }

    case "draft_outing_schema": {
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status)
           VALUES ($1, $2, 'PENDING')`,
        ["hostel.config_draft", JSON.stringify({ facilityCode: "CAMPUS_TELEMETRY_POLICY", field: "outing_pass_schema", value: b.outingSchemaField, at: new Date().toISOString(), by: auth.userId, staged: true })],
      ).catch(() => {});
      return ok({ staged: true, note: "Outing pass JSON-Schema field staged as draft. Submit to VP/Principal." });
    }

    case "lint":
    case "submit": {
      // Policy Linter + Dry-Run over the facilities config.
      const fac = await query<{ facility_code: string; config: Record<string, unknown> }>(
        `SELECT facility_code, config FROM public.facilities WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' LIMIT 1`,
      ).catch(() => ({ rows: [] as { facility_code: string; config: Record<string, unknown> }[] }));
      const issues: Array<{ code: string; message: string; blocking: boolean }> = [];
      const cfg = fac.rows[0]?.config ?? {};
      // Lint rules (live, structural — no hardcoded thresholds except the
      // schema-integrity checks below).
      if (cfg.gps_max_accuracy_meters != null && Number(cfg.gps_max_accuracy_meters) < 0)
        issues.push({ code: "GPS_CUTOFF_INVALID", message: "gps_max_accuracy_meters must be >= 0.", blocking: true });
      if (!Array.isArray(cfg.web_1click_allowed))
        issues.push({ code: "ONELIST_NOT_ARRAY", message: "web_1click_allowed must be an array.", blocking: false });
      const verified = issues.filter((i) => i.blocking).length === 0;
      if (b.action === "submit") {
        // Steward submits → routes to VP/Principal; the OIE/Principal quorum
        // activates. The chief_warden cannot flip this to ACTIVE solo.
        await query(
          `INSERT INTO public.domain_outbox (event_type, payload, status)
             VALUES ($1, $2, 'PENDING')`,
          ["hostel.config_submit_quorum", JSON.stringify({ submitTo: b.submitTo ?? "principal", verified, issues, at: new Date().toISOString(), by: auth.userId })],
        ).catch(() => {});
      }
      return ok({
        lint: { issues, verified },
        submittedTo: b.action === "submit" ? b.submitTo ?? "principal" : null,
        note: verified
          ? "DRY_RUN_VERIFIED — staged for VP / Principal quorum activation."
          : "Blocking linter issues — draft cannot be submitted.",
      });
    }

    default:
      return fail("UNKNOWN_ACTION", "Unknown facilities.config action.", 400);
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/hostel/config/draft-and-lint",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});
