// src/app/api/cron/academic-automation/route.ts
// /api/cron/academic-automation — */15 (or event-driven)
//
// The automation runtime entry point. Two modes:
//   1. Sweep mode (default): for each ACTIVE policy rule, evaluate the
//      configured condition against live data and fire the permitted actions.
//   2. Event mode (?event=attendance.marked&entityId=...&data={...}): evaluate
//      a specific event payload now (called synchronously by app code).
//
// The rule set, thresholds, autonomy levels and kill-switch are all config, so
// an institution tunes automation without a deploy. This route is the bridge
// between "the college's policy" and "the DB side effects" — and it writes a
// full explain-why automation_run for every decision (including "skipped" and
// "blocked by kill-switch").
//
// Bounded: requires the cron secret; agents only ever do what their autonomy
// level + allowed_actions permit (enforced by the engine, not here).

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import {
  evaluatePolicyRules,
  resolvePolicyValueTS,
  type EventPayload,
  type Actor,
} from "@/lib/academic-workflow-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(req.url);
    const eventMode = url.searchParams.get("event");
    const data = url.searchParams.get("data");
    const entityType = url.searchParams.get("entityType") ?? "student";
    const entityId = url.searchParams.get("entityId") ?? "unknown";

    // ── Event mode: evaluate one explicit payload now ──
    if (eventMode) {
      const payload: EventPayload = {
        event: eventMode,
        entityType,
        entityId,
        data: data ? JSON.parse(data) : {},
        actor: null as unknown as Actor,
      };
      const result = await evaluatePolicyRules(payload, {
        agentCode: url.searchParams.get("agent") ?? "event-engine",
      });
      return Response.json({ success: true, data: { mode: "event", event: eventMode, evaluation: result } });
    }

    // ── Sweep mode: evaluate each active rule against live thresholds ──
    const { rows: activeRules } = await query<{ code: string; event: string }>(
      `SELECT code, event FROM policy_rules WHERE is_active = true ORDER BY code`,
    );

    // Load the live context (department thresholds, etc.) so conditions can
    // be evaluated against real, inheritance-resolved values.
    const thresholds = await resolvePolicyValueTS("attendance_thresholds");

    const sweep: Array<{ rule: string; outcome: string; detail: string }> = [];
    for (const r of activeRules) {
      // Each rule declares which event it watches. For the sweep we build a
      // minimal synthetic payload from the live policy context; rules with
      // data-dependent conditions that we can't satisfy in sweep mode are
      // reported as "skipped(no_data)" rather than firing blindly.
      const payload: EventPayload = {
        event: r.event,
        entityType: "class",
        entityId: "sweep",
        data: { _context: thresholds },
        actor: null as unknown as Actor,
      };
      const ev = await evaluatePolicyRules(payload, { agentCode: "academic-automation-cron" });
      for (const m of ev.matched) {
        sweep.push({ rule: r.code, outcome: m.outcome, detail: m.reasons.join("; ") || "fired" });
      }
    }

    return Response.json({
      success: true,
      data: {
        mode: "sweep",
        active_rules: activeRules.length,
        thresholds,
        sweep,
      },
    });
  } catch (e: any) {
    console.error("[academic-automation cron]", e);
    return Response.json({ success: false, error: errMsg(e) }, { status: 500 });
  }
}
