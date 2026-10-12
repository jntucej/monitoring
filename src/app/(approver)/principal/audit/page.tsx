"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  RefreshCw,
  ArrowLeft,
  ScrollText,
  ClipboardCheck,
} from "lucide-react";
import { fetchJson, fmtDate, fmtTime, AuditRecord } from "../_shared";

function AuditContent({
  records,
  loading,
  error,
}: {
  records: AuditRecord[] | null;
  loading: boolean;
  error: string | null;
}) {
  const recent = (records ?? []).slice(0, 20);

  return (
    <WidgetBoundary title="Audit & Compliance">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <ScrollText className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Audit &amp; Compliance Summary
          </span>
          {records && records.length > 0 && (
            <span className="text-xs text-[var(--text-muted)] ml-auto">{records.length} total</span>
          )}
        </div>
        {loading && !records ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
          </div>
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : recent.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">No recent audit activity.</p>
        ) : (
          <ul className="space-y-2 min-w-0">
            {recent.map((r) => (
              <li key={r.id} className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-[var(--text-primary)] font-medium truncate">
                    {r.action}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 pl-5 min-w-0">
                  {r.user?.name || "System"} · {fmtDate(r.timestamp)} {fmtTime(r.timestamp)}
                  {r.details ? ` · ${r.details}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetBoundary>
  );
}

function AuditInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [records, setRecords] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const auditR = await fetchJson("/api/principal/audit");
    setRecords(auditR.success ? ((auditR.data as AuditRecord[]) ?? []) : null);
    setError(auditR.success ? null : auditR.error?.message ?? "Unknown error");
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
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <AuditContent
        records={records}
        loading={records === null && !error && refreshing}
        error={error}
      />

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalAuditPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuditInner />
    </Suspense>
  );
}
