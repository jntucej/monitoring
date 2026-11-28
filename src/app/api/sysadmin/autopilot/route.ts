import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import {
  health,
  createMission,
  getMission,
  getMissionEvents,
  transitionMission,
  getMissionStatus,
  getOutboxPending,
  type CreateMissionReq,
  type MissionStatus,
} from "@/server/services/autopilot/client";

/**
 * /api/sysadmin/autopilot — sysadmin-only proxy to the AUTOPILOT control
 * plane (Rust/Axum service on 127.0.0.1:8401, dedicated autopilot_runtime
 * DB). The control plane persists every transition atomically; this proxy
 * only reads and posts transitions, so the sysadmin UI never talks to the
 * service directly (keeps the DSN out of the browser + enforces the
 * role guard in one place).
 */

const MissionStatusSchema: MissionStatus[] = [
  "created", "queued", "context_assembly", "planning", "policy_check",
  "executing", "waiting_approval", "retrying", "blocked", "validating",
  "completed", "failed", "cancelled", "expired",
];

// ── GET ?action=... ─────────────────────────────────────────────────────
async function implGet(
  req: NextRequest,
  _ctx: ApiChainContext<unknown, AuthContext>,
): Promise<Response> {
  const action = req.nextUrl.searchParams.get("action") ?? "health";
  const id = req.nextUrl.searchParams.get("id") ?? "";

  switch (action) {
    case "health": {
      const r = await health();
      if (!r.ok) return fail("AUTOPILOT_UNREACHABLE", r.error ?? "autopilot service not reachable", 503);
      return ok(r.data);
    }
    case "outbox-pending": {
      const r = await getOutboxPending();
      if (!r.ok) return fail("AUTOPILOT_UNREACHABLE", r.error ?? "autopilot service not reachable", 503);
      return ok(r.data);
    }
    case "mission": {
      if (!id) return fail("VALIDATION", "mission id required", 400);
      const r = await getMission(id);
      if (!r.ok) return fail(r.status === 404 ? "NOT_FOUND" : "AUTOPILOT_ERROR", r.error ?? "mission not found", r.status === 404 ? 404 : 502);
      return ok(r.data);
    }
    case "mission-events": {
      if (!id) return fail("VALIDATION", "mission id required", 400);
      const r = await getMissionEvents(id);
      if (!r.ok) return fail("AUTOPILOT_ERROR", r.error ?? "events fetch failed", 502);
      return ok(r.data);
    }
    case "mission-status": {
      if (!id) return fail("VALIDATION", "mission id required", 400);
      const r = await getMissionStatus(id);
      if (!r.ok) return fail("AUTOPILOT_ERROR", r.error ?? "status fetch failed", 502);
      return ok(r.data);
    }
    default:
      return fail("VALIDATION", `unknown action '${action}'`, 400);
  }
}

// ── POST ─────────────────────────────────────────────────────────────────

async function implPost(
  req: NextRequest,
  ctx: ApiChainContext<unknown, AuthContext>,
): Promise<Response> {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("VALIDATION", "invalid JSON body", 400);

  const action = String(body.action ?? "");

  switch (action) {
    case "create-mission": {
      const m: CreateMissionReq = {
        tenant_id: body.tenant_id as string | undefined,
        initiator_id: String(body.initiator_id ?? auth.userId),
        objective: String(body.objective ?? ""),
        workspace_id: String(body.workspace_id ?? "gate_monitor"),
        mode: (body.mode as "read_only" | "workspace_write" | "approval_required") ?? "workspace_write",
        context_limit: Number(body.context_limit ?? 8192),
        max_steps: Number(body.max_steps ?? 20),
        max_retries: Number(body.max_retries ?? 3),
        timeout_seconds: Number(body.timeout_seconds ?? 900),
      };
      if (!m.objective) return fail("VALIDATION", "objective is required", 400);
      if (m.context_limit > 16384) return fail("VALIDATION", "context_limit exceeds the 16384 frozen maximum", 400);
      const r = await createMission(m);
      if (!r.ok) return fail("AUTOPILOT_ERROR", r.error ?? "mission creation failed", 502);
      return ok(r.data);
    }

    case "transition": {
      const id = String(body.id ?? "");
      const to = String(body.to ?? "") as MissionStatus;
      if (!id) return fail("VALIDATION", "mission id required", 400);
      if (!MissionStatusSchema.includes(to)) {
        return fail("VALIDATION", `invalid target status '${to}' (Contract B enum)`, 400);
      }
      const actor = String(body.actor ?? auth.userId);
      const r = await transitionMission(id, to, actor);
      if (!r.ok) {
        // 409 = illegal transition (state machine backstop fired).
        const status = r.status === 409 ? 409 : 502;
        return fail(r.status === 409 ? "ILLEGAL_TRANSITION" : "AUTOPILOT_ERROR", r.error ?? "transition failed", status);
      }
      return ok(r.data);
    }

    default:
      return fail("VALIDATION", `unknown action '${action}'`, 400);
  }
}

export const GET = withApiChain(implGet, {
  route: "/api/sysadmin/autopilot",
  auth: "user",
  requiredRole: ["sysadmin"],
  rateLimit: { keyPrefix: "autopilot_read", maxRequests: 60 },
});

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/autopilot",
  auth: "user",
  requiredRole: ["sysadmin"],
  rateLimit: { keyPrefix: "autopilot_write", maxRequests: 20 },
});
