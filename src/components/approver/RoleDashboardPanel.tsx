"use client";

import { useMemo } from "react";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";

export interface KpiDef {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
}

export interface RoleDashboardPanelProps {
  title: string;
  icon?: LucideIcon;
  endpoint: string | null;
  mapKpis?: (data: unknown) => KpiDef[];
  pollMs?: number;
}

function defaultMapKpis(data: unknown): KpiDef[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.kpis)) {
    return obj.kpis.map((k: any) => ({
      label: String(k?.label ?? "—"),
      value: k?.value ?? "—",
      hint: k?.hint,
      tone: k?.tone,
    }));
  }
  if (Array.isArray(obj.metrics)) {
    return obj.metrics.map((k: any) => ({
      label: String(k?.label ?? k?.key ?? "—"),
      value: k?.value ?? "—",
      hint: k?.hint,
      tone: k?.tone,
    }));
  }
  if (obj.counts && typeof obj.counts === "object") {
    return Object.entries(obj.counts as Record<string, unknown>).map(([k, v]) => ({
      label: k.replace(/_/g, " "),
      value: typeof v === "number" ? v : String(v ?? "—"),
    }));
  }
  if (Array.isArray(data)) {
    return [{ label: "Items", value: data.length }];
  }
  if (Array.isArray(obj.data)) {
    return [{ label: "Items", value: (obj.data as unknown[]).length }];
  }

  return [];
}

const TONE_CLASSES = {
  neutral: "border-[var(--border)] bg-[var(--bg-elevated,var(--bg-surface))]",
  ok: "border-emerald-500/30 bg-emerald-500/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  danger: "border-rose-500/30 bg-rose-500/5",
} as const;

export function RoleDashboardPanel({
  title,
  icon: Icon,
  endpoint,
  mapKpis,
  pollMs = 30_000,
}: RoleDashboardPanelProps) {
  const resource = useApiResource<{ data?: unknown } | unknown>(endpoint, {
    ttlMs: 15_000,
  });

  usePolling(
    () => (endpoint ? resource.refresh() : Promise.resolve()),
    { intervalMs: pollMs, enabled: !!endpoint },
  );

  const raw = useMemo(() => {
    const d = resource.data as any;
    if (d && typeof d === "object" && "data" in d && d.data !== undefined) return d.data;
    return d;
  }, [resource.data]);

  const kpis = useMemo(() => {
    if (!endpoint) return [];
    if (mapKpis) {
      try {
        return mapKpis(raw);
      } catch {
        return [];
      }
    }
    return defaultMapKpis(raw);
  }, [endpoint, mapKpis, raw]);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated,var(--bg-surface))] p-5">
      <header className="flex items-center gap-2 mb-4">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-emerald-400" />
          </div>
        )}
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </header>

      {!endpoint && (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center space-y-1">
          <Inbox className="w-6 h-6 mx-auto text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            KPI panel coming soon
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            The backend endpoint for this role is not yet wired.
          </p>
        </div>
      )}

      {endpoint && resource.loading && kpis.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
              <div className="h-2.5 w-1/2 bg-[var(--text-muted)]/10 rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-[var(--text-muted)]/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {endpoint && resource.error && kpis.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Could not load KPIs: {resource.error}{" "}
            <button
              onClick={() => resource.refresh()}
              className="underline hover:text-rose-200"
            >
              Retry
            </button>
          </span>
        </div>
      )}

      {endpoint && !resource.loading && !resource.error && kpis.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
          No metrics available yet
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${TONE_CLASSES[k.tone ?? "neutral"]}`}
            >
              <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] truncate">
                {k.label}
              </p>
              <p className="text-xl font-semibold tabular-nums mt-1">{k.value}</p>
              {k.hint && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                  {k.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {endpoint && resource.loading && kpis.length > 0 && (
        <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-[var(--text-muted)]">
          <Loader2 className="w-3 h-3 animate-spin" />
          refreshing
        </div>
      )}
    </section>
  );
}
