"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { cachedFetch, clearCache } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role, GatePass, Alert, Person, Gate } from "@/lib/types";
import {
  ShieldCheck,
  Clock,
  Building2,
  MapPin,
  AlertTriangle,
  KeyRound,
  Users,
  RefreshCw,
  UserCheck,
  DoorOpen,
  Inbox,
  Siren,
  History,
} from "lucide-react";

const MIN_TIER = 60; // warden tier
const HOSTEL_CODES = ["CSE", "IT", "ECE", "EEE", "ME"] as const;
type HostelCode = (typeof HOSTEL_CODES)[number];
const HOSTEL_CAPACITIES: Record<HostelCode, number> = {
  CSE: 500,
  IT: 450,
  ECE: 400,
  EEE: 350,
  ME: 400,
};

const PASSES_URL = "/api/passes?status=PENDING&limit=100";
const ALERTS_URL = "/api/alerts?resolved=false";
const MATRIX_URL = "/api/occupancy/presence-matrix";

type Resp = { success: boolean; data?: unknown; error?: { message?: string } };

async function fetchJson(url: string): Promise<Resp> {
  try {
    const d = await cachedFetch<Resp>(url, {
      ttlMs: 10_000,
      headers: getAuthHeaders(),
    });
    return d ?? { success: false, error: { message: "Empty response" } };
  } catch (e) {
    return { success: false, error: { message: e instanceof Error ? e.message : "Request failed" } };
  }
}

// ------------------------------------------------------------- shared bits
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-[var(--text-primary)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | boolean;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${accent}`}>
        {typeof value === "boolean" ? (value ? "ON" : "OFF") : value}
      </p>
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

function Panel({
  title,
  sub,
  icon: Icon,
  right,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-indigo-400" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
            {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-4 sm:p-5 flex-1 min-w-0">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-[var(--text-muted)] py-6 text-center">{text}</p>;
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

// ------------------------------------------------------------- Pass panel
// Gate/terminal directory for the warden desk: pass rows carry no gate info
// today, so the desk label is derived from the live gate feed and rendered
// defensively (never leaks "undefined"/"NaN" into the panel).
function useGateDesk(): { desks: string; loading: boolean } {
  const [gates, setGates] = useState<Gate[] | null>(null);
  useEffect(() => {
    let active = true;
    fetchJson("/api/gates").then((r) => {
      if (!active) return;
      if (r.success && Array.isArray(r.data)) {
        const names = (r.data as Gate[]).filter((g) => g?.name).map((g) => g.name);
        setGates(names.length ? (names as unknown as Gate[]) : []);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return { desks: gates ? `${gates.length}` : "…", loading: gates === null };
}

function PendingPassesPanel({ onLoaded }: { onLoaded?: () => void }) {
  const [passes, setPasses] = useState<GatePass[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFailedFor, setActionFailedFor] = useState<string | null>(null);
  const { desks, loading: desksLoading } = useGateDesk();

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const r = await fetchJson(PASSES_URL);
    setPasses(r.success ? ((r.data as GatePass[]) ?? []) : null);
    setFetchError(r.success ? null : r.error?.message ?? "Unknown error");
    setLoading(false);
    onLoaded?.();
  }, [onLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (id: string, action: "approve" | "reject") => {
      setActionBusy(id + ":" + action);
      setActionError(null);
      const comment = action === "reject" ? "Rejected by warden" : "";
      try {
        const res = await fetch(`/api/passes/${id}/action`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action, comment }),
        });
        const json = (await res.json().catch(() => null)) as Resp | null;
        if (!res.ok || !json?.success) {
          setActionError(json?.error?.message ?? `HTTP ${res.status}`);
          setActionFailedFor(id + ":" + action);
          return;
        }
        clearCache(PASSES_URL);
        void load();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Network error");
        setActionFailedFor(id + ":" + action);
      } finally {
        setActionBusy(null);
      }
    },
    [load]
  );

  return (
    <Panel
      title="Pending Gate Passes"
      sub={`Approve or reject hostel outpass requests · gate terminal desk ${desksLoading ? "loading…" : `${desks} terminal(s)`}`}
      icon={Inbox}
      className="sm:col-span-1 lg:col-span-1 min-w-0"
      right={
        <span className="text-xs text-[var(--text-muted)]">
          {passes ? `${passes.length} open` : "…"}
        </span>
      }
    >
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {fetchError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Could not load passes: {fetchError}
            <button onClick={() => void load()} className="ml-2 underline text-indigo-400 hover:text-indigo-300">
              retry
            </button>
          </span>
        </div>
      )}
      {!loading && passes && passes.length === 0 && !fetchError && (
        <EmptyState text="No pending passes. All clear." />
      )}
      {!loading && passes && passes.length > 0 && (
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {passes.map((p) => {
            const busy = actionBusy === p.id + ":approve" || actionBusy === p.id + ":reject";
            const expired = p.to ? new Date(p.to).getTime() < Date.now() : false;
            const safeName = p.studentName && p.studentName !== "undefined" ? p.studentName : "Unknown student";
            return (
              <li key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4 space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {safeName}
                      <span className="ml-2 font-mono text-xs text-[var(--text-muted)]">{p.roll || "—"}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {p.department || "—"} · {p.reason || "Gate pass"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Destination:{" "}
                      <span className="text-[var(--text-primary)] break-words">{p.description || p.reason || "—"}</span>
                      {" · "}Valid until{" "}
                      <span className={expired ? "text-rose-400" : "text-[var(--text-primary)]"}>
                        {fmtDate(p.to)} {fmtTime(p.to)}
                        {expired ? " (expired)" : ""}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void act(p.id, "approve")}
                      disabled={busy}
                      className="rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/25 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void act(p.id, "reject")}
                      disabled={busy}
                      className="rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 px-3 py-1.5 text-xs font-medium hover:bg-rose-500/25 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {actionFailedFor === p.id + ":approve" || actionFailedFor === p.id + ":reject" ? (
                  <p className="text-xs text-rose-400">{actionError}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------- Occupancy
interface HostelRow {
  hostel: HostelCode;
  count: number;
  capacity: number;
}

async function fetchHostelActive(hostel: HostelCode): Promise<HostelRow> {
  const url = `/api/students?scope=active&hostel=${hostel}`;
  const r = await fetchJson(url);
  const list = r.success ? ((r.data as Person[]) ?? []) : [];
  return { hostel, count: list.length, capacity: HOSTEL_CAPACITIES[hostel] };
}

function HostelOccupancyPanel() {
  const [rows, setRows] = useState<HostelRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const results = await Promise.all(HOSTEL_CODES.map((code) => fetchHostelActive(code)));
      if (cancelled) return;
      setRows(results);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel
      title="Hostel Occupancy"
      sub="Active students per block vs. capacity"
      icon={Building2}
      className="sm:col-span-1 lg:col-span-1"
    >
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {rows && (
        <ul className="space-y-4">
          {rows.map((r) => {
            const pct = Math.min(100, Math.round((r.count / r.capacity) * 100));
            const full = r.count >= r.capacity;
            return (
              <li key={r.hostel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{r.hostel}</span>
                  <span className="text-[var(--text-muted)]">
                    {r.count} in / {r.capacity} · out of campus {r.capacity - r.count}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      full ? "bg-rose-500" : pct > 80 ? "bg-amber-400" : "bg-indigo-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------- Movement
interface DayBar {
  label: string;
  ins: number;
  outs: number;
}

interface ActiveOnCampus {
  roll: string;
  name: string;
  lastScan: string;
}

function RecentMovementPanel({ students }: { students: Person[] | null }) {
  const [chart, setChart] = useState<DayBar[] | null>(null);
  const [onCampus, setOnCampus] = useState<ActiveOnCampus[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const active = (students ?? []).filter((s) => s.roll);
      // Fetch per-student history for up to 20 students to keep requests bounded.
      const slice = active.slice(0, 20);
      const histories = await Promise.all(
        slice.map(async (s) => {
          const url = `/api/persons/${encodeURIComponent(s.roll ?? s.uniqueId ?? "")}/history?limit=70`;
          const r = await fetchJson(url);
          const data = r.success ? (r.data as { history?: Array<{ direction?: string; timestamp?: string }> }) : null;
          return data?.history ?? [];
        })
      );
      if (cancelled) return;

      // 7-day in/out bar chart aggregated across all fetched students
      const bars = new Map<string, DayBar>();
      const labels: string[] = [];
      const sevenDaysAgo = Date.now() - 7 * 24 * 3_600_000;
      for (const h of histories.flat()) {
        if (!h.timestamp) continue;
        const t = new Date(h.timestamp).getTime();
        if (Number.isNaN(t) || t < sevenDaysAgo) continue;
        const key = new Date(t).toLocaleDateString([], { day: "2-digit", month: "short" });
        if (!bars.has(key)) {
          bars.set(key, { label: key, ins: 0, outs: 0 });
          labels.push(key);
        }
        const b = bars.get(key)!;
        const dir = String(h.direction ?? "").toUpperCase();
        if (dir === "IN") b.ins += 1;
        else if (dir === "OUT") b.outs += 1;
      }
      const chartRows = labels.map((l) => bars.get(l)!);
      setChart(chartRows);

      // Currently on-campus = last scan IN and within 24 h
      const now = Date.now();
      const current: ActiveOnCampus[] = [];
      slice.forEach((s, i) => {
        const h = histories[i];
        if (!h.length || !h[0]?.timestamp) return;
        const last = h[0];
        const lastTs = String(last.timestamp ?? "");
        const dir = String(last.direction ?? "").toUpperCase();
        const t = new Date(lastTs).getTime();
        if (dir === "IN" && !Number.isNaN(t) && now - t < 24 * 3_600_000) {
          current.push({ roll: s.roll ?? s.uniqueId ?? "", name: s.fullName || s.name || s.roll || "Unknown", lastScan: lastTs });
        }
      });
      setOnCampus(current);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [students]);

  const maxVal = Math.max(...(chart ?? []).map((b) => Math.max(b.ins, b.outs)), 1);

  return (
    <Panel
      title="Recent Movement"
      sub="7-day in/out activity · students currently on campus"
      icon={History}
      className="sm:col-span-1 lg:col-span-1"
    >
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {!loading && chart && chart.length === 0 && <EmptyState text="No movement recorded in the last 7 days." />}
      {!loading && chart && chart.length > 0 && (
        <div className="flex items-end gap-2 h-32 mb-4">
          {chart.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col justify-end w-full h-24 gap-0.5">
                <div
                  className="w-full rounded-t bg-indigo-500/80"
                  style={{ height: `${Math.max(4, (b.ins / maxVal) * 100)}%` }}
                  title={`${b.ins} in`}
                />
                <div
                  className="w-full rounded-b bg-amber-400/70"
                  style={{ height: `${Math.max(4, (b.outs / maxVal) * 100)}%` }}
                  title={`${b.outs} out`}
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted)] truncate w-full text-center">{b.label}</span>
            </div>
          ))}
        </div>
      )}
      {!loading && onCampus !== null && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            On campus now ({onCampus.length})
          </p>
          {onCampus.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No students with a recent IN scan.</p>
          ) : (
            <ul className="space-y-2 sm:space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {onCampus.map((s) => (
                <li key={s.roll} className="flex items-center justify-between text-xs rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2.5 gap-2">
                  <span className="text-[var(--text-primary)] font-medium truncate min-w-0">{s.name}</span>
                  <span className="font-mono text-[var(--text-muted)] shrink-0">{s.roll}</span>
                  <span className="text-emerald-400 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    IN {fmtTime(s.lastScan)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------- Alerts
function AlertsPanel({ alerts, loading, error }: { alerts: Alert[] | null; loading: boolean; error: string | null }) {
  const sevColor: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <Panel
      title="Active Alerts"
      sub="Unresolved campus & curfew alerts"
      icon={Siren}
      className="sm:col-span-2 lg:col-span-2"
      right={alerts ? <span className="text-xs text-[var(--text-muted)]">{alerts.length} open</span> : null}
    >
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {error && !loading && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load alerts: {error}
        </div>
      )}
      {alerts && alerts.length === 0 && !loading && !error && <EmptyState text="No active alerts. All clear." />}
      {alerts && alerts.length > 0 && (
        <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4 flex items-start gap-3">
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  sevColor[a.severity] ?? sevColor.low
                }`}
              >
                {a.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{a.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{a.message}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {fmtTime(a.timestamp)} · {fmtDate(a.timestamp)}
                  {a.studentRoll ? ` · roll ${a.studentRoll}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------- Presence matrix
function PresenceMatrixPanel({
  matrixData,
  loading,
  error,
}: {
  matrixData: { gates?: Array<{ id: string; name?: string; code?: string }>; roles?: string[]; matrix?: Record<string, Record<string, number>>; lastUpdated?: string } | null;
  loading: boolean;
  error: string | null;
}) {
  const gates = matrixData?.gates ?? [];
  const roles = matrixData?.roles ?? [];
  const matrix = matrixData?.matrix ?? {};

  return (
    <Panel
      title="Live Gate Presence"
      sub="Who is inside each gate right now, by role"
      icon={MapPin}
      className="sm:col-span-2 lg:col-span-2"
    >
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {error && !loading && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load presence matrix: {error}
        </div>
      )}
      {matrixData && !loading && !error && gates.length === 0 && <EmptyState text="No active gates configured." />}
      {matrixData && !loading && !error && gates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-[var(--text-muted)] font-semibold pr-3 pb-2">Gate</th>
                {roles.map((r) => (
                  <th key={r} className="text-center text-[var(--text-muted)] font-semibold px-1.5 pb-2">
                    {r.length > 6 ? `${r.slice(0, 5)}…` : r}
                  </th>
                ))}
                <th className="text-right text-[var(--text-muted)] font-semibold pl-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((g) => {
                const row = matrix[g.id] ?? {};
                const total = roles.reduce((acc, r) => acc + (Number(row[r]) || 0), 0);
                return (
                  <tr key={g.id} className="border-t border-[var(--border)]">
                    <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                      {g.name || g.code || g.id}
                    </td>
                    {roles.map((r) => {
                      const v = Number(row[r]) || 0;
                      return (
                        <td key={r} className="text-center px-1.5 py-2.5">
                          <span
                            className={`inline-block min-w-[1.5rem] rounded px-1 py-0.5 text-center font-mono ${
                              v > 0
                                ? v >= 20
                                  ? "bg-emerald-500/30 text-emerald-300"
                                  : "bg-indigo-500/25 text-indigo-300"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            {v}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-right pl-2 font-mono text-[var(--text-primary)]">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {matrixData.lastUpdated && (
            <p className="text-[10px] text-[var(--text-muted)] mt-2">Updated {fmtTime(matrixData.lastUpdated)}</p>
          )}
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------- main inner
function WardenDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "warden") as Role;
  const tier = getRoleTier(role);

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ---- data state
  const [passes, setPasses] = useState<GatePass[] | null>(null);
  const [passesError, setPassesError] = useState<string | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<{ gates?: Array<{ id: string; name?: string; code?: string }>; roles?: string[]; matrix?: Record<string, Record<string, number>>; lastUpdated?: string } | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [passesR, studentsR, alertsR, matrixR] = await Promise.all([
      fetchJson(PASSES_URL),
      fetchJson("/api/students?scope=active"),
      fetchJson(ALERTS_URL),
      fetchJson(MATRIX_URL),
    ]);
    setPasses(passesR.success ? ((passesR.data as GatePass[]) ?? []) : null);
    setPassesError(passesR.success ? null : passesR.error?.message ?? "Unknown error");
    setStudents(studentsR.success ? ((studentsR.data as Person[]) ?? []) : null);
    setStudentsError(studentsR.success ? null : studentsR.error?.message ?? "Unknown error");
    setAlerts(alertsR.success ? ((alertsR.data as Alert[]) ?? []) : null);
    setAlertsError(alertsR.success ? null : alertsR.error?.message ?? "Unknown error");
    setMatrix(matrixR.success ? (matrixR.data ?? null) : null);
    setMatrixError(matrixR.success ? null : matrixR.error?.message ?? "Unknown error");
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  // ---- derived KPIs
  const onCampusNow = students?.length ?? 0;
  const pendingPasses = passes?.length ?? 0;
  const activeAlerts = alerts?.length ?? 0;

  const lastBreach = useMemo(() => {
    if (!alerts || alerts.length === 0) return null;
    const curfew = alerts.filter((a) => {
      const t = `${a.title} ${a.message}`.toLowerCase();
      return t.includes("curfew") || t.includes("late night") || a.severity === "critical";
    });
    const src = curfew.length > 0 ? curfew : alerts;
    const sorted = [...src].sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
    return sorted[0] ?? null;
  }, [alerts]);

  const kpis: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub: string; accent: string }> = [
    {
      icon: UserCheck,
      label: "On-Campus Now",
      value: students === null ? "…" : onCampusNow,
      sub: "Active students not checked out",
      accent: "text-emerald-400",
    },
    {
      icon: DoorOpen,
      label: "Off-Campus",
      value: students === null ? "…" : "n/a",
      sub: "Tracked via pending outpass queue",
      accent: "text-sky-400",
    },
    {
      icon: Inbox,
      label: "Pending Passes",
      value: passes === null ? "…" : pendingPasses,
      sub: "Awaiting warden / admin decision",
      accent: pendingPasses > 0 ? "text-amber-400" : "text-emerald-400",
    },
    {
      icon: Siren,
      label: "Active Alerts",
      value: alerts === null ? "…" : activeAlerts,
      sub: "Unresolved campus alerts",
      accent: activeAlerts > 0 ? "text-rose-400" : "text-emerald-400",
    },
    {
      icon: Clock,
      label: "Last Curfew Breach",
      value: lastBreach ? fmtTime(lastBreach.timestamp) : "None",
      sub: lastBreach ? `${lastBreach.title}${lastBreach.studentRoll ? ` · ${lastBreach.studentRoll}` : ""}` : "No curfew alerts on record",
      accent: lastBreach ? "text-rose-400" : "text-emerald-400",
    },
    {
      icon: KeyRound,
      label: "Assigned Hostel",
      value: user?.assignedHostel ?? "All Blocks",
      sub: "Hostel block under supervision",
      accent: "text-indigo-400",
    },
  ];

  const anyLoading =
    passes === null || students === null || alerts === null || matrix === null;
  const anyError =
    passesError || studentsError || alertsError || matrixError;

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            Warden Command Center
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · hostel &amp; curfew oversight
            {lastRefresh && <span className="ml-2">· last refresh {fmtTime(lastRefresh.toISOString())}</span>}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {anyError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            Data fetch failed: {anyError}
            <button onClick={() => void refresh()} className="ml-2 underline text-amber-300 hover:text-amber-200">
              retry
            </button>
          </span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {kpis.map((k) => (
          <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
        ))}
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <WidgetBoundary title="Pending Gate Passes">
          <PendingPassesPanel />
        </WidgetBoundary>

        <WidgetBoundary title="Hostel Occupancy">
          <HostelOccupancyPanel />
        </WidgetBoundary>

        <WidgetBoundary title="Recent Movement">
          <RecentMovementPanel students={students} />
        </WidgetBoundary>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <WidgetBoundary title="Active Alerts">
          <AlertsPanel alerts={alerts} loading={alerts === null} error={alertsError} />
        </WidgetBoundary>

        <WidgetBoundary title="Live Gate Presence Matrix">
          <PresenceMatrixPanel matrixData={matrix} loading={matrix === null} error={matrixError} />
        </WidgetBoundary>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function WardenDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <WardenDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
