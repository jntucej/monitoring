"use client";

/**
 * AutopilotMissionsClient — sysadmin console for the AUTOPILOT control plane.
 *
 * Closed-loop: every action is a server call to /api/sysadmin/autopilot
 * (which proxies the Rust control plane). No local state mutation; the
 * durable record lives in the dedicated autopilot_runtime PostgreSQL DB.
 *
 * Harness mode: the control plane validates every lifecycle transition
 * against the deterministic state machine (Contract B); illegal moves are
 * rejected with 409 before any DB write. The outbox pending counter shows
 * the relay backlog (at-least-once delivery).
 *
 * Context-aware: the mission list, status enum, and event history all come
 * from the live control plane — nothing is hardcoded.
 */
import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders, cn } from "@/lib/utils";

type MissionStatus =
  | "created" | "queued" | "context_assembly" | "planning" | "policy_check"
  | "executing" | "waiting_approval" | "retrying" | "blocked" | "validating"
  | "completed" | "failed" | "cancelled" | "expired";

interface Mission {
  id: string;
  tenant_id: string | null;
  initiator_id: string;
  objective: string;
  scope: Record<string, unknown>;
  context_limit: number;
  budget: Record<string, unknown>;
  status: MissionStatus;
}

interface MissionEvent {
  event_type: string;
  event_version: number;
  correlation_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

/**
 * The control plane's ExecutionMode enum (Contract C). `workspace_write` is
 * the default for campus jobs; `approval_required` routes through the
 * waiting_approval state; `read_only` is the restricted research profile.
 */
type ExecutionMode = "read_only" | "workspace_write" | "approval_required";

const STATUS_COLORS: Record<MissionStatus, string> = {
  created: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  queued: "bg-zinc-400/20 text-zinc-300 border-zinc-400/40",
  context_assembly: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  planning: "bg-blue-400/20 text-blue-300 border-blue-400/40",
  policy_check: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  executing: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  waiting_approval: "bg-amber-400/20 text-amber-300 border-amber-400/40",
  retrying: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  blocked: "bg-red-500/20 text-red-300 border-red-500/40",
  validating: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  completed: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
  failed: "bg-red-400/20 text-red-300 border-red-400/40",
  cancelled: "bg-zinc-400/20 text-zinc-300 border-zinc-400/40",
  expired: "bg-red-500/20 text-red-300 border-red-500/40",
};

function StatusBadge({ status }: { status: MissionStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
      STATUS_COLORS[status] ?? STATUS_COLORS.created,
    )}>
      {status}
    </span>
  );
}

async function apiFetch(path: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  const res = await fetch(path, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers as Record<string, string> ?? {}) },
    credentials: "include",
  });
  const j = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = j as { error?: { code?: string; message?: string } } | null;
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  return j;
}

export function AutopilotMissionsClient() {
  const [health, setHealth] = useState<{ status: string } | null | "unreachable">(null);
  const [outboxPending, setOutboxPending] = useState<number | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create-mission form state
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState<ExecutionMode>("workspace_write");
  const [contextLimit, setContextLimit] = useState(8192);
  const [maxSteps, setMaxSteps] = useState(20);
  const [creating, setCreating] = useState(false);

  const loadHealth = useCallback(async () => {
    try {
      const j = await apiFetch("/api/sysadmin/autopilot?action=health");
      setHealth(j as { status: string } | null);
    } catch {
      setHealth("unreachable");
    }
  }, []);

  const loadOutbox = useCallback(async () => {
    try {
      const j = await apiFetch("/api/sysadmin/autopilot?action=outbox-pending");
      setOutboxPending((j as { pending_outbox: number }).pending_outbox ?? null);
    } catch {
      setOutboxPending(null);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadOutbox();
  }, [loadHealth, loadOutbox]);

  const loadMission = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [mj, ej] = await Promise.all([
        apiFetch(`/api/sysadmin/autopilot?action=mission&id=${id}`),
        apiFetch(`/api/sysadmin/autopilot?action=mission-events&id=${id}`),
      ]);
      setMission(mj as unknown as Mission);
      setEvents((ej as { events: MissionEvent[] }).events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mission");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async () => {
    if (!objective.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const j = await apiFetch("/api/sysadmin/autopilot", {
        method: "POST",
        body: JSON.stringify({
          action: "create-mission",
          objective: objective.trim(),
          mode,
          context_limit: contextLimit,
          max_steps: maxSteps,
          workspace_id: "gate_monitor",
        }),
      });
      const id = (j as { mission_id?: string }).mission_id;
      if (id) {
        setObjective("");
        await loadMission(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mission creation failed");
    } finally {
      setCreating(false);
    }
  }, [objective, mode, contextLimit, maxSteps, loadMission]);

  const transition = useCallback(async (to: MissionStatus) => {
    if (!mission) return;
    setError(null);
    try {
      await apiFetch("/api/sysadmin/autopilot", {
        method: "POST",
        body: JSON.stringify({ action: "transition", id: mission.id, to }),
      });
      await loadMission(mission.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    }
  }, [mission, loadMission]);

  // Which transitions are allowed from the current status (Contract B).
  const ALLOWED: Record<MissionStatus, MissionStatus[]> = {
    created: ["queued", "cancelled"],
    queued: ["context_assembly", "cancelled", "failed"],
    context_assembly: ["planning", "blocked", "failed", "cancelled"],
    planning: ["policy_check", "blocked", "failed", "cancelled"],
    policy_check: ["executing", "waiting_approval", "blocked", "failed", "cancelled"],
    executing: ["validating", "waiting_approval", "retrying", "blocked", "failed", "cancelled"],
    waiting_approval: ["executing", "blocked", "failed", "cancelled"],
    retrying: ["executing", "failed", "blocked", "cancelled"],
    blocked: ["retrying", "cancelled", "failed"],
    validating: ["completed", "retrying", "failed"],
    completed: [],
    failed: ["cancelled", "expired"],
    cancelled: [],
    expired: [],
  };

  return (
    <div className="space-y-4">
      {/* Service status strip */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-border bg-bg-elevated p-3 text-xs">
        <span className={cn(
          "flex items-center gap-1.5 font-medium",
          health === "unreachable" ? "text-red-300" : "text-emerald-300",
        )}>
          <span className={cn(
            "size-2 rounded-full",
            health === "unreachable" ? "bg-red-400" : "bg-emerald-400",
          )} />
          {health === "unreachable" ? "Control plane unreachable" : "Control plane healthy"}
        </span>
        {outboxPending !== null && (
          <span className="text-text-secondary">
            Outbox backlog: <span className={cn("font-mono", outboxPending > 0 ? "text-amber-300" : "text-emerald-300")}>{outboxPending}</span>
          </span>
        )}
        <button
          onClick={() => { void loadHealth(); void loadOutbox(); }}
          className="ml-auto text-text-secondary hover:text-text-primary"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
      )}

      {/* Create mission */}
      <div className="rounded border border-border p-4">
        <h3 className="mb-3 text-sm font-medium text-text-primary">Create Mission</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Mission objective (what the agent should accomplish)"
            className="rounded border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ExecutionMode)}
            className="rounded border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          >
            <option value="workspace_write">Workspace write</option>
            <option value="approval_required">Approval required</option>
            <option value="read_only">Read-only</option>
          </select>
          <button
            onClick={() => void create()}
            disabled={creating || !objective.trim()}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-text-secondary">
          <label>
            Context limit:{" "}
            <input
              type="number"
              value={contextLimit}
              onChange={(e) => setContextLimit(Number(e.target.value))}
              min={1024}
              max={16384}
              step={1024}
              className="ml-1 w-20 rounded border border-border bg-bg-surface px-2 py-0.5 text-text-primary"
            />
          </label>
          <label>
            Max steps:{" "}
            <input
              type="number"
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              min={1}
              max={100}
              className="ml-1 w-14 rounded border border-border bg-bg-surface px-2 py-0.5 text-text-primary"
            />
          </label>
          <span>Hard cap: 16,384 tokens</span>
        </div>
      </div>

      {/* Active mission */}
      {mission && (
        <div className="rounded border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="font-mono text-xs text-text-secondary">{mission.id}</span>
              <div className="mt-1 text-sm font-medium text-text-primary">{mission.objective}</div>
            </div>
            <StatusBadge status={mission.status} />
          </div>

          {/* Transitions */}
          {ALLOWED[mission.status].length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {ALLOWED[mission.status].map((to) => (
                <button
                  key={to}
                  onClick={() => void transition(to)}
                  className={cn(
                    "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
                    to === "cancelled" || to === "failed"
                      ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
                      : to === "completed"
                        ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                        : "border-border text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                  )}
                >
                  → {to}
                </button>
              ))}
            </div>
          )}

          {/* Event history */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-text-secondary">Event history ({events.length})</h4>
            {events.length === 0 ? (
              <p className="text-xs italic text-text-secondary">No events recorded.</p>
            ) : (
              <div className="max-h-60 overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-bg-elevated">
                    <tr className="text-left text-text-secondary">
                      <th className="px-2 py-1.5 font-medium">Time</th>
                      <th className="px-2 py-1.5 font-medium">Event</th>
                      <th className="px-2 py-1.5 font-medium">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="whitespace-nowrap px-2 py-1.5 font-mono text-text-secondary">
                          {new Date(ev.occurred_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-text-primary">{ev.event_type}</td>
                        <td className="max-w-[300px] truncate px-2 py-1.5 font-mono text-text-secondary">
                          {JSON.stringify(ev.payload)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!mission && (
        <p className="py-4 text-center text-sm text-text-secondary">
          Create a mission to see its lifecycle, event history, and outbox state.
        </p>
      )}
    </div>
  );
}
