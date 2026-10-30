"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { FileText, Users, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportRow {
  label: string;
  value: string;
  sub?: string;
}

function ReviewReportsInner() {
  const [data, setData] = useState<{ total: number; approved: number; rejected: number; pending: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions?status=ALL&limit=1");
      const json = await res.json();
      if (json.success && json.data) {
        setData({
          total: json.data.length ?? 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  const reports: ReportRow[] = [
    { label: "Total Requests", value: data ? String(data.total) : "—", sub: "All permission requests on file" },
    { label: "Approved", value: data ? String(data.approved) : "—", sub: "Approved permissions" },
    { label: "Rejected", value: data ? String(data.rejected) : "—", sub: "Rejected permissions" },
    { label: "Pending", value: data ? String(data.pending) : "—", sub: "Awaiting decision" },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Reports</h1>

      <PrincipalWidgetBoundary title="Institutional Reports">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reports.map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)]">{r.label}</div>
                <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{r.value}</div>
                {r.sub && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{r.sub}</div>}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
            <p className="font-medium text-[var(--text-secondary)]">Detailed Analytics</p>
            <p className="mt-0.5">Restricted to admin/sysadmin roles. Contact your administrator for export access.</p>
          </div>
        </div>
      </PrincipalWidgetBoundary>
    </div>
  );
}

export default function ReviewReportsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <ReviewReportsInner />
    </Suspense>
  );
}
