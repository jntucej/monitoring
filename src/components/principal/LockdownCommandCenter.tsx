"use client";

import { useEffect, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { ShieldAlert, Clock3, Users, Siren, Activity, TimerOff } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface ActiveRuleView {
  ruleId: string;
  scope_type: string;
  direction: string;
  public_message: string | null;
  started_at: string | null;
  expires_at: string | null;
  initiated_by: string | null;
  approved_by: string | null;
  inside: number;
  outside: number;
}
interface AttemptView {
  roll: string | null;
  gate_id: string | null;
  direction: string | null;
  attempted_at: string;
  attempts: number;
}
interface LockdownAttemptsResponse {
  attempts: AttemptView[];
  activeRules: ActiveRuleView[];
  unacknowledged: AttemptView[];
  totalBlocked: number;
}

const SCOPE_HUMAN: Record<string, string> = {
  campus: "Entire campus",
  gate: "Gate(s)",
  role: "Role-wise",
  persona: "Persona",
  department: "Department",
  hostel_block: "Hostel block",
  class_section: "Class / section",
  user: "Individual",
};

/**
 * LockdownCommandCenter — the read-only, full-operational-context view of the
 * active lockdown: when each scope was locked, elapsed + auto-expiry, the
 * Inside vs. Outside affected split, live blocked-scan attempts (who tried to
 * cross, how many times, at which gate, repeat-offender highlight), and an
 * unacknowledged-alert badge when no one has responded within 5 minutes.
 *
 * Reused by /admin/lockdown (read-only + "Principal required to lift" badge)
 * and /principal/emergency (paired with the approve/lift controls). Live data
 * via GET /api/admin/lockdown/attempts. Human identifiers only — no UUIDs.
 */
export function LockdownCommandCenter() {
  const { data, refresh } = useApiResource<LockdownAttemptsResponse>(
    "/api/admin/lockdown/attempts",
    { ttlMs: 10_000 },
  );
  // Live elapsed / countdown ticks. The clock seeds lazily on mount (a pure
  // lazy initializer is allowed) and the interval keeps it current.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll the attempts endpoint so "live" telemetry updates.
  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => {
      void refresh();
    }, 10_000);
    return () => clearInterval(t);
  }, [data, refresh]);

  const activeRules = data?.activeRules ?? [];
  const attempts = data?.attempts ?? [];
  const unacknowledged = data?.unacknowledged ?? [];
  const totalBlocked = data?.totalBlocked ?? 0;
  const hasActive = activeRules.length > 0;

  return (
    <WidgetBoundary title="Lockdown Command Center">
      {!hasActive && (
        <div className="surface-card p-4 text-sm text-text-secondary">
          No active lockdowns. All gates are in normal operation.
        </div>
      )}

      {activeRules.map((r) => (
        <div key={r.ruleId} className="surface-card p-4 space-y-4 mb-4">
          {/* ── Active Lockdown Header ─────────────────────────── */}
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-action-danger" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {SCOPE_HUMAN[r.scope_type] ?? r.scope_type} · {directionLabel(r.direction)}
                </h3>
                <p className="text-xs text-text-muted">{r.public_message}</p>
              </div>
            </div>
            <StatusChips rule={r} now={now} />
          </header>

          {/* ── Inside vs. Outside affected split ──────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <SplitCell
              icon={Users}
              label="Inside campus"
              value={r.inside}
              tone="ok"
            />
            <SplitCell
              icon={TimerOff}
              label="Outside (on pass / off)"
              value={r.outside}
              tone="warn"
            />
          </div>

          {/* ── Live blocked-scan attempts ─────────────────────── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <Activity className="size-3.5" /> Live blocked attempts
                {totalBlocked > 0 && (
                  <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-bold text-text-primary tabular-nums">
                    {totalBlocked}
                  </span>
                )}
              </h4>
              {unacknowledged.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-action-danger/15 px-2 py-0.5 text-[10px] font-bold text-action-danger">
                  <Siren className="size-3" /> {unacknowledged.length} unacknowledged
                </span>
              )}
            </div>
            {attempts.length === 0 ? (
              <p className="text-xs text-text-muted">No blocked attempts in the last 30 minutes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-text-muted">
                      <th className="px-2 py-1.5">Who</th>
                      <th className="px-2 py-1.5">Gate</th>
                      <th className="px-2 py-1.5">Dir</th>
                      <th className="px-2 py-1.5">Attempts</th>
                      <th className="px-2 py-1.5">Last</th>
                      <th className="px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {attempts.map((a, i) => {
                      const repeat = a.attempts >= 2;
                      const unacked = unacknowledged.some(
                        (u) =>
                          u.roll === a.roll &&
                          u.gate_id === a.gate_id &&
                          u.direction === a.direction,
                      );
                      return (
                        <tr
                          key={`${a.roll}-${a.gate_id}-${i}`}
                          className={repeat ? "bg-action-warning/5" : undefined}
                        >
                          <td className="px-2 py-1.5 font-medium text-text-primary">
                            {humanizeRoll(a.roll)}
                          </td>
                          <td className="px-2 py-1.5 text-text-secondary">{humanizeGate(a.gate_id)}</td>
                          <td className="px-2 py-1.5 text-text-secondary">{a.direction}</td>
                          <td className="px-2 py-1.5 text-text-secondary tabular-nums">
                            {a.attempts}
                            {repeat && " · repeat"}
                          </td>
                          <td className="px-2 py-1.5 text-text-muted">
                            {relTime(a.attempted_at, now)}
                          </td>
                          <td className="px-2 py-1.5">
                            {unacked ? (
                              <span className="rounded bg-action-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-action-danger">
                                Unacknowledged
                              </span>
                            ) : (
                              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                                Tracked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </WidgetBoundary>
  );
}

function StatusChips({ rule, now }: { rule: ActiveRuleView; now: number }) {
  if (now <= 0) return null; // first render before the clock seeds
  const started = rule.started_at ? new Date(rule.started_at).getTime() : null;
  const elapsed = started ? Math.max(0, Math.floor((now - started) / 1000)) : null;
  const expiry = rule.expires_at ? new Date(rule.expires_at).getTime() : null;
  const toExpiry = expiry ? Math.floor((expiry - now) / 1000) : null;
  const expired = toExpiry !== null && toExpiry <= 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {started && elapsed !== null && (
        <span className="inline-flex items-center gap-1 rounded bg-bg-elevated px-2 py-0.5 text-text-secondary">
          <Clock3 className="size-3" /> Started {relTime(new Date(started).toISOString(), now)}
          <span className="tabular-nums">· {fmtDuration(elapsed)}</span>
        </span>
      )}
      {expiry !== null && (
        <span
          className={
            "inline-flex items-center gap-1 rounded px-2 py-0.5 " +
            (expired
              ? "bg-action-danger/15 text-action-danger"
              : "bg-action-warning/15 text-action-warning")
          }
        >
          <TimerOff className="size-3" />
          {expired ? "Auto-expired" : `Expires in ${fmtDuration(Math.max(0, toExpiry!))}`}
        </span>
      )}
    </div>
  );
}

function SplitCell({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "text-action-success"
      : "text-action-warning";
  return (
    <div className="rounded-lg border border-border/60 bg-bg-surface/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <Icon className={"size-3.5 " + cls} aria-hidden />
        {label}
      </div>
      <p className={"mt-1 text-2xl font-semibold tabular-nums " + cls}>{value}</p>
    </div>
  );
}

function directionLabel(d: string): string {
  if (d === "BOTH") return "IN + OUT";
  if (d === "IN") return "Entry only";
  if (d === "OUT") return "Exit only";
  return d;
}

function fmtDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function relTime(iso: string, now: number): string {
  if (now <= 0) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/**
 * Never render a raw gate UUID or user UUID on this non-sysadmin surface.
 * A roll number is a human identifier (fine); a gate is shown by its code
 * (the attempts endpoint returns gate_id which is a gate code, not a UUID).
 */
function humanizeRoll(roll: string | null): string {
  if (!roll) return "Unknown";
  // A bare UUID is never a roll — treat it as an unresolvable identifier.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roll)) {
    return "Individual (unresolved)";
  }
  return roll;
}
function humanizeGate(gateId: string | null): string {
  if (!gateId) return "—";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gateId)) {
    return "Assigned gate";
  }
  return gateId;
}
