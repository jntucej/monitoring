"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/formatters";

interface Alert {
  id: string;
  severity: string;
  title: string;
  message?: string;
  timestamp: string;
  studentRoll?: string;
}

/**
 * /principal/respond/incidents — incident oversight page.
 * Reuses patterns from the legacy incidents page.
 */
function IncidentsInner() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?resolved=false");
      const json = await res.json();
      setAlerts(json.success ? (json.data as Alert[]) : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, { intervalMs: 30_000 });

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Incident Oversight</h1>

      <PrincipalWidgetBoundary title="Active Incidents">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
          {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

          {loading && !alerts ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm py-4">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              No active incidents. All clear.
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 15).map((a) => (
                <li key={a.id} className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${
                      a.severity === "critical" ? "text-rose-400" : a.severity === "high" ? "text-amber-400" : "text-sky-400"
                    }`}>
                      {a.severity?.toUpperCase() || "INFO"}
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">{a.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                      {fmtDate(a.timestamp)} {fmtTime(a.timestamp)}
                    </span>
                  </div>
                  {a.message && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{a.message}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PrincipalWidgetBoundary>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <IncidentsInner />
    </Suspense>
  );
}
