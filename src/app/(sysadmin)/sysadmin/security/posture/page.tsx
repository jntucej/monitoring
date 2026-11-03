"use client";

import { useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { cn } from "@/lib/utils";

interface Check {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "unknown";
  detail: string;
  runbook: string;
  batch: string;
}

interface Posture {
  overall: "ok" | "warn" | "fail" | "unknown";
  score: number;
  generatedAt: string;
  checks: Check[];
}

const tone: Record<Check["status"], string> = {
  ok: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  warn: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  fail: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  unknown: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

function IconFor({ s }: { s: Check["status"] }) {
  if (s === "ok") return <ShieldCheck className="h-5 w-5" />;
  if (s === "fail") return <ShieldAlert className="h-5 w-5" />;
  return <ShieldQuestion className="h-5 w-5" />;
}

export default function SecurityPosturePage() {
  const { data, loading, error, refresh, refreshKey } = useDashboardData<Posture>(
    "/api/sysadmin/security-posture",
    { pollMs: 30_000, ttlMs: 15_000 }
  );

  const grouped = useMemo(() => {
    const g: Record<string, Check[]> = {};
    for (const c of data?.checks ?? []) (g[c.batch] ??= []).push(c);
    return g;
  }, [data]);

  if (loading && !data) {
    return <div className="p-6 text-sm text-slate-400">Loading security posture…</div>;
  }
  if (error && !data) {
    return <div className="p-6 text-sm text-rose-400">Error: {error}</div>;
  }

  const posture = data!;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Security posture"
        subtitle="Every defence from Batches A–I, in one view. Red = act now."
        onRefresh={refresh}
        actions={
          <button
            onClick={refresh}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      <WidgetBoundary key={refreshKey}>
        <div
          className={cn(
            "mt-4 rounded-xl border p-4 flex items-center gap-4",
            tone[posture.overall]
          )}
        >
          <Activity className="h-8 w-8" />
          <div>
            <div className="text-2xl font-semibold">{posture.score}% green</div>
            <div className="text-xs opacity-80">
              {posture.checks.length} checks · updated{" "}
              {new Date(posture.generatedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {Object.entries(grouped).map(([batch, checks]) => (
        <section key={batch} className="mt-6">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            Batch {batch}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {checks.map((c) => (
              <WidgetBoundary key={c.id} name={c.id}>
                <div
                  className={cn(
                    "block rounded-lg border p-3",
                    tone[c.status]
                  )}
                >
                  <div className="flex items-center gap-2">
                    <IconFor s={c.status} />
                    <span className="text-sm font-medium">{c.label}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80">{c.detail}</p>
                  <p className="mt-2 text-[10px] opacity-60">
                    runbook → {c.runbook}
                  </p>
                </div>
              </WidgetBoundary>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
