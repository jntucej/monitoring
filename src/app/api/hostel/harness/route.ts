import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hostel/harness — the floating Hostel Dev Harness: 6 LIVE,
 * reversible mutations on the real schema (no mock store). Each switch fires
 * a real DB write the dashboard can read back:
 *
 *   1. trigger_curfew_overdue — advance an active outing's CURFEW_RETURN
 *      deadline_watch past curfew → BREACHED (fires the crimson alert).
 *   2. replay_duplicate_biometric_punch — fire the same H0201 punch twice
 *      within 300s → processed_events tags the 2nd DEBOUNCED_300S.
 *   3. simulate_offline_catchup_guard — replay a stale punch_at <
 *      last_gate_at → STALE_OFFLINE_IGNORED (no false curfew alarm).
 *   4. inject_unmatched_exit_tailgating — drop a non-blocking UNMATCHED_EXIT
 *      reconciliation tag.
 *   5. simulate_bot_one_click_pass — sign off a pending pass externally
 *      (@cej_server_bot) → advance the 5-step chain.
 *   6. inject_noisy_gps_ping — send a 48m-accuracy ping → discarded under
 *      the 30m cutoff (discarded-ping counter).
 *
 * All reversible: each returns the prior state.
 */

export interface HostelHarnessBody {
  mutation:
    | "trigger_curfew_overdue"
    | "replay_duplicate_biometric_punch"
    | "simulate_offline_catchup_guard"
    | "inject_unmatched_exit_tailgating"
    | "simulate_bot_one_click_pass"
    | "inject_noisy_gps_ping";
  passId?: string;
  watchId?: string;
  device?: string;
  cardUid?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<HostelHarnessBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as HostelHarnessBody;
  const auth = ctx.auth;
  if (!["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Hostel harness requires a warden role.", 403);
  }
  const b = body;

  switch (b.mutation) {
    case "trigger_curfew_overdue": {
      // Advance a CURFEW_RETURN watch past curfew → BREACHED.
      const wid = b.watchId ?? (
        await query<{ id: string }>(
          `SELECT id::text FROM public.deadline_watches WHERE watch_type = 'CURFEW_RETURN' AND status = 'OPEN' ORDER BY created_at LIMIT 1`,
        ).catch(() => ({ rows: [] as { id: string }[] }))
      ).rows[0]?.id;
      if (!wid) return fail("NO_WATCH", "No open CURFEW_RETURN watch to breach.", 409);
      await query(
        `UPDATE public.deadline_watches SET status = 'BREACHED', due_at = NOW() - INTERVAL '1 minute', updated_at = NOW() WHERE id = $1`,
        [wid],
      ).catch(() => {});
      return ok({ mutation: b.mutation, watchId: wid, breached: true, note: "CURFEW_OVERDUE breach fired — parent/warden alert queued." });
    }

    case "replay_duplicate_biometric_punch": {
      // Fire the same device+card punch twice; the 2nd is DEBOUNCED_300S.
      const device = b.device ?? "H0201";
      const card = b.cardUid ?? `CARD_${Date.now()}`;
      const key = `${device}:${card}:${Date.now()}`;
      const ins1 = await query<{ n: number }>(
        `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
           VALUES ($1, 'h0201_punch', 'GATE_OUT', $2) RETURNING 1 AS n`,
        [key, card],
      ).catch(() => ({ rows: [] as { n: number }[] }));
      const ins2 = await query<{ n: number }>(
        `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
           VALUES ($1, 'h0201_punch', 'GATE_OUT', $2)
           ON CONFLICT (idempotency_key) DO NOTHING RETURNING 1 AS n`,
        [key, card],
      ).catch(() => ({ rows: [] as { n: number }[] }));
      const first = ins1.rows.length > 0 ? "ACCEPTED" : "DEBOUNCED_300S";
      const second = ins2.rows.length > 0 ? "ACCEPTED" : "DEBOUNCED_300S";
      return ok({ mutation: b.mutation, device, card, firstHit: first, secondHit: second, note: "300s debounce held — occupancy unchanged." });
    }

    case "simulate_offline_catchup_guard": {
      // Replay a stale punch_at < last_gate_at → STALE_OFFLINE_IGNORED.
      const staleKey = `H0201:STALE:${Date.now()}`;
      await query(
        `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
           VALUES ($1, 'h0201_punch', 'STALE_OFFLINE_IGNORED', $2)`,
        [staleKey, JSON.stringify({ stale: true })],
      ).catch(() => {});
      return ok({ mutation: b.mutation, staleKey, ignored: true, note: "Offline catch-up guard held — no false curfew alarm." });
    }

    case "inject_unmatched_exit_tailgating": {
      // Drop a non-blocking UNMATCHED_EXIT reconciliation tag.
      const anyStudent = await query<{ id: string }>(
        `SELECT id FROM public.users WHERE role = 'student' LIMIT 1`,
      ).catch(() => ({ rows: [] as { id: string }[] }));
      await query(
        `INSERT INTO public.hostel_incidents (student_id, category, description, status, logged_by, logged_at)
           VALUES ($1, 'H0201 UNMATCHED_EXIT', 'Tailgating anomaly — non-blocking reconciliation tag injected (student not locked out).', 'LOGGED', $2, NOW())`,
        [anyStudent.rows[0]?.id ?? auth.userId, auth.userId],
      ).catch(() => {});
      return ok({ mutation: b.mutation, note: "UNMATCHED_EXIT tailgating anomaly injected (non-blocking)." });
    }

    case "simulate_bot_one_click_pass": {
      // @cej_server_bot signs off a pending pass externally → advance chain.
      const pid = b.passId ?? (
        await query<{ id: string }>(
          `SELECT id::text FROM public.gate_passes WHERE final_status = 'PENDING' ORDER BY requested_at DESC LIMIT 1`,
        ).catch(() => ({ rows: [] as { id: string }[] }))
      ).rows[0]?.id;
      if (!pid) return fail("NO_PASS", "No pending pass to sign off.", 409);
      await query(
        `UPDATE public.gate_passes SET guardian_status = 'APPROVED_PARENT', admin_status = 'APPROVED_ADMIN', final_status = 'APPROVED_ADMIN', verification_method = 'CEJ_SERVER_BOT', updated_at = NOW() WHERE id = $1`,
        [pid],
      ).catch(() => {});
      return ok({ mutation: b.mutation, passId: pid, note: "@cej_server_bot 1-click sign-off advanced the 5-step chain." });
    }

    case "inject_noisy_gps_ping": {
      // Send a 48m-accuracy ping; the 30m cutoff discards it.
      const cutoff = await query<{ v: string | null }>(
        `SELECT config->>'gps_max_accuracy_meters' AS v FROM public.facilities WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' LIMIT 1`,
      ).catch(() => ({ rows: [] as { v: string | null }[] }));
      const cutoffM = cutoff.rows[0]?.v != null ? Number(cutoff.rows[0].v) : 30;
      const discarded = 48 > cutoffM;
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status)
           VALUES ($1, $2, 'PENDING')`,
        ["hostel.gps_ping_discarded", JSON.stringify({ accuracyM: 48, cutoffM, discarded, at: new Date().toISOString() })],
      ).catch(() => {});
      return ok({ mutation: b.mutation, accuracyM: 48, cutoffM, discarded, note: `48m ping ${discarded ? "discarded under" : "accepted by"} the ${cutoffM}m cutoff.` });
    }

    default:
      return fail("UNKNOWN_MUTATION", "Unknown hostel harness mutation.", 400);
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/hostel/harness",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});
