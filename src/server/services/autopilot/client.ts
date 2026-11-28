/**
 * AUTOPILOT control-plane client (U002 + harness wiring).
 *
 * The AUTOPILOT service is a Rust/Axum process on 127.0.0.1:8401 with its
 * own dedicated PostgreSQL database (autopilot_runtime) and role
 * (autopilot_runtime_app). This module is a thin, server-only HTTP client
 * that the sysadmin API routes use to read/transition missions.
 *
 * Closed-loop: the control plane persists every transition atomically
 * (status + audit + event + outbox in one PG transaction). This client
 * only READS and POSTs transitions — it never mutates mission state
 * directly in the DB. The outbox relay (worker) publishes unpublished
 * events downstream; a crash after COMMIT but before publish is
 * recovered by the relay re-reading unpublished rows (at-least-once).
 *
 * Persistent: all mission state lives in PostgreSQL; a process restart
 * recovers from the durable record. The client is stateless.
 *
 * Harness mode: the control plane is the harness — it validates every
 * lifecycle transition against the deterministic state machine and
 * rejects illegal moves with 409 before any DB write.
 */
import { fetch } from "undici";

const AUTOPILOT_BASE = process.env.AUTOPILOT_API_BASE ?? "http://127.0.0.1:8401";

// ── Types (mirror the AUTOPILOT API response shapes) ─────────────────────

export type MissionStatus =
  | "created"
  | "queued"
  | "context_assembly"
  | "planning"
  | "policy_check"
  | "executing"
  | "waiting_approval"
  | "retrying"
  | "blocked"
  | "validating"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface Mission {
  id: string;
  tenant_id: string | null;
  initiator_id: string;
  objective: string;
  scope: Record<string, unknown>;
  context_limit: number;
  budget: Record<string, unknown>;
  status: MissionStatus;
}

export interface MissionEvent {
  event_type: string;
  event_version: number;
  correlation_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface CreateMissionReq {
  tenant_id?: string;
  initiator_id: string;
  objective: string;
  workspace_id: string;
  mode: "read_only" | "workspace_write" | "approval_required";
  context_limit: number;
  max_steps: number;
  max_retries: number;
  timeout_seconds: number;
}

// ── HTTP client ───────────────────────────────────────────────────────────

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const res = await fetch(`${AUTOPILOT_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    // Network failure (service down) — distinct from an HTTP error.
    return new Response(JSON.stringify({ error: `autopilot unreachable: ${err instanceof Error ? err.message : String(err)}` }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  });

  const text = await res.text();
  let data: T | null = null;
  try {
    data = JSON.parse(text) as T;
  } catch {
    data = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    error: res.ok ? null : (data as { error?: string } | null)?.error ?? text ?? `HTTP ${res.status}`,
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/** Service health (process up + PG reachable). */
export async function health(): Promise<ApiResult<{ status: string; service: string }>> {
  return request("GET", "/health");
}

/** Create a durable mission + its "mission.created" event (atomic). */
export async function createMission(
  req: CreateMissionReq,
): Promise<ApiResult<{ mission_id: string; status: MissionStatus }>> {
  return request("POST", "/v1/missions", req as unknown as Record<string, unknown>);
}

/** Read a durable mission by id (survives process restart). */
export async function getMission(
  id: string,
): Promise<ApiResult<Mission>> {
  return request("GET", `/v1/missions/${id}`);
}

/** Read the append-only event history for a mission. */
export async function getMissionEvents(
  id: string,
): Promise<ApiResult<{ mission_id: string; events: MissionEvent[] }>> {
  return request("GET", `/v1/missions/${id}/events`);
}

/**
 * Drive ONE lifecycle transition, atomically persisting:
 *   status update + audit row + event + outbox row (single PG tx).
 * Illegal transitions are rejected with 409 (no DB write).
 */
export async function transitionMission(
  id: string,
  to: MissionStatus,
  actor: string,
): Promise<ApiResult<{ mission_id: string; status: MissionStatus; transitioned_by: string }>> {
  return request("POST", `/v1/missions/${id}/transition`, {
    status: to,
    actor,
  });
}

/** Durable restart-recovery: current status for a mission. */
export async function getMissionStatus(
  id: string,
): Promise<ApiResult<{ mission_id: string; status: MissionStatus }>> {
  return request("GET", `/v1/missions/${id}/status`);
}

/** Count of unpublished outbox events (relay backlog). */
export async function getOutboxPending(): Promise<ApiResult<{ pending_outbox: number }>> {
  return request("GET", "/v1/outbox/pending");
}
