"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { cachedFetch, clearCache } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role, GatePass, Alert, Person } from "@/lib/types";
import {
  ShieldCheck,
  Clock,
  Building2,
  MapPin,
  AlertTriangle,
  Users,
  RefreshCw,
  UserCheck,
  Inbox,
  Siren,
} from "lucide-react";

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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-[var(--text-primary)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

interface HostelRow {
  hostel: string;
  count: number;
  capacity: number;
}

const HOSTEL_CODES = ["CSE", "IT", "ECE", "EEE", "ME"] as const;
const HOSTEL_CAPACITIES: Record<string, number> = {
  CSE: 500,
  IT: 450,
  ECE: 400,
  EEE: 350,
  ME: 400,
};

function hostelRowFor(code: string, count: number): HostelRow {
  return { hostel: code, count, capacity: HOSTEL_CAPACITIES[code] ?? 0 };
}

function HostelOccupancyPanel({
  roster,
}: {
  roster: Person[] | null;
}) {
  // Derive per-hostel occupancy client-side from the single active roster
  // fetch (reuses the /api/students?scope=active data already loaded by the
  // page). No more 5 parallel per-hostel /api/students calls.
  const rows: HostelRow[] | null = useMemo(() => {
    if (!roster) return null;
    const counts: Record<string, number> = {};
    for (const code of HOSTEL_CODES) counts[code] = 0;
    for (const p of roster) {
      const block = (p.hostelBlock || p.studentDetails?.hostelBlock || "").toUpperCase();
      if (block in counts) counts[block] += 1;
    }
    return HOSTEL_CODES.map((code) => hostelRowFor(code, counts[code] ?? 0));
  }, [roster]);

  return (
    <WidgetBoundary title="Hostel Occupancy">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
          <Building2 className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Occupancy</span>
        </div>
        {rows === null ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => {
              const pct = r.capacity > 0 ? Math.min(100, Math.round((r.count / r.capacity) * 100)) : 0;
              const full = r.capacity > 0 && r.count >= r.capacity;
              return (
                <li key={r.hostel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">{r.hostel}</span>
                    <span className="text-[var(--text-muted)]">
                      {r.count} in / {r.capacity} · out of campus {Math.max(r.capacity - r.count, 0)}
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
      </div>
    </WidgetBoundary>
  );
}

function AlertsPanel({ alerts, loading, error }: { alerts: Alert[] | null; loading: boolean; error: string | null }) {
  const sevColor: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <WidgetBoundary title="Active Alerts">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Active Alerts
            </span>
          </div>
          {alerts && <span className="text-xs text-[var(--text-muted)]">{alerts.length} open</span>}
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        {error && !loading && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load alerts: {error}
          </div>
        )}
        {alerts && alerts.length === 0 && !loading && !error && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No active alerts. All clear.</p>
        )}
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
      </div>
    </WidgetBoundary>
  );
}

function PresenceMatrixPanel({
  matrixData,
  loading,
  error,
}: {
  matrixData:
    | { gates?: Array<{ id: string; name?: string; code?: string }>; roles?: string[]; matrix?: Record<string, Record<string, number>>; lastUpdated?: string }
    | null;
  loading: boolean;
  error: string | null;
}) {
  const gates = matrixData?.gates ?? [];
  const roles = matrixData?.roles ?? [];
  const matrix = matrixData?.matrix ?? {};

  return (
    <WidgetBoundary title="Live Gate Presence">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Live Gate Presence</span>
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        {error && !loading && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load presence matrix: {error}
          </div>
        )}
        {matrixData && !loading && !error && gates.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No active gates configured.</p>
        )}
        {matrixData && !loading && !error && gates.length > 0 && (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-xs min-w-[560px]">
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
      </div>
    </WidgetBoundary>
  );
}

function PrincipalDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [passes, setPasses] = useState<GatePass[] | null>(null);
  const [passesError, setPassesError] = useState<string | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<{
    gates?: Array<{ id: string; name?: string; code?: string }>;
    roles?: string[];
    matrix?: Record<string, Record<string, number>>;
    lastUpdated?: string;
  } | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [passesR, studentsR, alertsR, matrixR] = await Promise.all([
      fetchJson("/api/passes?status=PENDING&limit=100"),
      fetchJson("/api/students?scope=active"),
      fetchJson("/api/alerts?resolved=false"),
      fetchJson("/api/occupancy/presence-matrix"),
    ]);
    setPasses(passesR.success ? ((passesR.data as GatePass[]) ?? []) : null);
    setPassesError(passesR.success ? null : passesR.error?.message ?? "Unknown error");
    setStudents(studentsR.success ? ((studentsR.data as Person[]) ?? []) : null);
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
      icon: Inbox,
      label: "Pending Passes",
      value: passes === null ? "…" : pendingPasses,
      sub: "Awaiting a decision",
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
      sub: lastBreach
        ? `${lastBreach.title}${lastBreach.studentRoll ? ` · ${lastBreach.studentRoll}` : ""}`
        : "No curfew alerts on record",
      accent: lastBreach ? "text-rose-400" : "text-emerald-400",
    },
  ];

  const anyError = passesError || alertsError || matrixError;

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Principal Command Center
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · campus-wide oversight
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        {kpis.map((k) => (
          <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
        ))}
      </div>

      {/* Pending permission approvals — principal is final approver for exams */}
      <WidgetBoundary title="Pending Approvals">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Pending Approvals</span>
          </div>
          <PermissionList
            title="Pending Approvals"
            workflowType="exam"
            currentStage="principal"
            fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
            allowForward={false}
          />
        </div>
      </WidgetBoundary>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <HostelOccupancyPanel roster={students} />
        <AlertsPanel alerts={alerts} loading={alerts === null} error={alertsError} />
      </div>

      <PresenceMatrixPanel matrixData={matrix} loading={matrix === null} error={matrixError} />

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalDashboardPage() {
  return (
    <GuardedPage allowedRoles={["principal"]}>
      <Suspense fallback={<PageLoading />}>
        <PrincipalDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
