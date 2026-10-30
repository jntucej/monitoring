"use client";

import { Suspense, useState } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { clearCache } from "@/hooks/useApiResource";
import { useState as useState2 } from "react";
import { ScrollText, XCircle, CheckCircle, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface AuditRecord {
  id: string;
  action: string;
  user_name?: string;
  user_role?: string;
  details?: Record<string, unknown> | string | null;
  timestamp: string;
}

function ReviewAuditInner() {
  const [showRejected, setShowRejected] = useState(true);
  const [records, setRecords] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    clearCache();
    try {
      const res = await fetch("/api/principal/audit");
      const json = await res.json();
      setRecords(json.success ? (json.data as AuditRecord[]) : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setRefreshing(false);
    }
  };

  usePolling(load, { intervalMs: 30_000 });

  // Filter: show all, or only rejected/override
  const visibleRecords = (records ?? []).filter((r) => {
    if (!showRejected) return true;
    return /REJECT|OVERRIDE|ESCALAT/i.test(r.action);
  });

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit Log</h1>
        <button
          type="button"
          onClick={() => setShowRejected((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            showRejected
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showRejected ? "Show all events" : "Rejected / Overrides only"}
        </button>
      </div>

      <PrincipalWidgetBoundary title="Audit & Compliance">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
          {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

          {refreshing && !records ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : records && records.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">No audit events recorded yet.</p>
          ) : (
            <ul className="space-y-2 max-h-[400px] overflow-y-auto">
              {visibleRecords.slice(0, 20).map((r) => (
                <li key={r.id} className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    {/REJECT/i.test(r.action) ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-[var(--text-primary)] flex-1 min-w-0 truncate">
                      {r.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                      {r.user_name || "System"} · {fmtDate(r.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PrincipalWidgetBoundary>
    </div>
  );
}

export default function ReviewAuditPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <ReviewAuditInner />
    </Suspense>
  );
}
