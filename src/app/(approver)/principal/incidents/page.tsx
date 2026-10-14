"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Alert, Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  ArrowLeft,
  Siren,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { fetchJson, fmtTime, fmtDate, OutpassRow } from "../_shared";

function IncidentContent({
  alerts,
  loading,
  error,
}: {
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
}) {
  const top = useMemo(() => {
    if (!alerts) return [];
    const sev = (a: Alert) =>
      a.severity === "critical" ? 0 : a.severity === "high" ? 1 : 2;
    return [...alerts].sort((a, b) => sev(a) - sev(b)).slice(0, 10);
  }, [alerts]);

  const sevColor = (s?: string) =>
    s === "critical" ? "text-rose-400" : s === "high" ? "text-amber-400" : "text-sky-400";

  return (
    <WidgetBoundary title="Incident Oversight">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Siren className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Incident Oversight
          </span>
          {alerts && alerts.length > 0 && (
            <span className="text-xs text-rose-400 ml-auto">{alerts.length} total</span>
          )}
        </div>
        {loading && !alerts ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
          </div>
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : top.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400 text-xs py-4">
            <XCircle className="w-3.5 h-3.5" />
            No open incidents. All clear.
          </div>
        ) : (
          <ul className="space-y-3 min-w-0">
            {top.map((a) => (
              <li key={a.id || a.title} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-bold ${sevColor(a.severity)} shrink-0`}>
                    {a.severity?.toUpperCase() || "INFO"}
                  </span>
                  <span className="text-xs text-[var(--text-primary)] truncate">{a.title}</span>
                </div>
                {a.message && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 min-w-0">
                    {a.message}
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {fmtDate(a.timestamp)} {fmtTime(a.timestamp)}
                  {a.studentRoll ? ` · roll ${a.studentRoll}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetBoundary>
  );
}

function IncidentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [escalated, setEscalated] = useState<OutpassRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [alertsR, escR] = await Promise.all([
      fetchJson("/api/alerts?resolved=false"),
      fetchJson("/api/permissions?status=ESCALATED&limit=25"),
    ]);
    setAlerts(alertsR.success ? ((alertsR.data as Alert[]) ?? []) : null);
    setEscalated(escR.success ? ((escR.data as OutpassRow[]) ?? []) : null);
    setError(alertsR.success ? null : alertsR.error?.message ?? "Unknown error");
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
            {lastRefresh && (
              <span className="ml-2">· last refresh {new Date(lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </p>
        </div>
      </div>

      <IncidentContent
        alerts={alerts}
        loading={alerts === null && !error && refreshing}
        error={error}
      />

      {/* Escalated requests + resolution progress (spec: escalated + resolution progress) */}
      <WidgetBoundary title="Escalated Requests & Resolution">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {escalated === null ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
            </div>
          ) : (escalated.length ?? 0) === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs py-3">
              <CheckCircle2 className="w-3.5 h-3.5" /> No escalations. All incidents resolved within stage.
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {(escalated?.length ?? 0)} request(s) have been escalated beyond their stage and need
                principal intervention.
              </p>
              <ul className="space-y-2 min-w-0">
                {(escalated ?? []).map((r) => (
                  <li
                    key={r.id}
                    className="min-w-0 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 flex items-center gap-2"
                  >
                    <Siren className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="font-mono text-xs text-[var(--text-primary)] shrink-0">
                      {r.ticket_number}
                    </span>
                    <span className="text-xs text-[var(--text-primary)] truncate min-w-0 flex-1">
                      {r.student?.name || "—"}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase shrink-0">
                      {r.workflow_type.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
                Resolution progress and decisions are logged in the{" "}
                <Link
                  href="/principal/audit"
                  className="underline hover:text-[var(--text-primary)]"
                >
                  Audit &amp; Accountability
                </Link>{" "}
                section.
              </p>
            </>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalIncidentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <IncidentsInner />
    </Suspense>
  );
}
