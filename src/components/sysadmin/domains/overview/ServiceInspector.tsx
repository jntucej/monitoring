"use client";

import { useEffect, useState } from "react";
import { Database, Server, Cpu, HardDrive, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { cachedFetch } from "@/hooks/useApiResource";
import type { HealthData } from "@/components/sysadmin/domains/monitoring/types";

const SERVICE_META: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; detail: string; section: keyof HealthData }> = {
  caddy: {
    icon: Globe,
    label: "Caddy Reverse Proxy",
    detail: "TLS termination and routing. Status reflects environment readiness.",
    section: "app",
  },
  web: {
    icon: Server,
    label: "Web Application",
    detail: "Next.js app server handling API and UI requests.",
    section: "app",
  },
  postgres: {
    icon: Database,
    label: "PostgreSQL Database",
    detail: "Primary data store. Connection counts and pool usage below.",
    section: "database",
  },
  redis: {
    icon: HardDrive,
    label: "Redis Cache / Queue",
    detail: "In-memory cache and job queue backend.",
    section: "redis",
  },
  worker: {
    icon: Cpu,
    label: "Background Worker",
    detail: "Processes async jobs, notifications, and scheduled tasks.",
    section: "redis",
  },
};

function SectionPanel({ section, data, loading }: { section: keyof HealthData; data: HealthData; loading: boolean }) {
  if (loading) {
    return <p className="text-xs text-[var(--text-muted)] py-2">Loading inspector…</p>;
  }
  switch (section) {
    case "app": {
      const rate = data.app?.errorRate24h ?? [];
      const avg = rate.length ? rate.reduce((a, b) => a + b, 0) / rate.length : 0;
      return (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-muted)]">24h average API error rate: <span className="font-semibold text-[var(--text-primary)]">{(avg * 100).toFixed(2)}%</span></p>
          <p className="text-xs text-[var(--text-muted)]">Last 5 samples: <span className="font-mono text-[10px] text-[var(--text-primary)]">{rate.slice(-5).map((v) => `${Math.round(v * 100)}%`).join(" · ")}</span></p>
        </div>
      );
    }
    case "database": {
      const db = data.database;
      if (!db) return <p className="text-xs text-[var(--text-muted)]">No database metrics.</p>;
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-2">
            <p className="text-[10px] uppercase text-[var(--text-muted)]">Active Conns</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{db.conns}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-2">
            <p className="text-[10px] uppercase text-[var(--text-muted)]">Pool Slots</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{db.pool}</p>
          </div>
        </div>
      );
    }
    case "redis": {
      const r = data.redis;
      if (!r) return <p className="text-xs text-[var(--text-muted)]">No redis metrics.</p>;
      return (
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-muted)]">
            Worker status: <span className={cn("font-semibold", r.worker_healthy ? "text-[var(--action-primary)]" : "text-[var(--action-danger)]")}>{r.worker_healthy ? "Healthy" : "Degraded"}</span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">Queue depth: <span className="font-semibold text-[var(--text-primary)]">{r.queue_depth}</span></p>
        </div>
      );
    }
    default:
      return null;
  }
}

export function ServiceInspector({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load health details on mount; cachedFetch handles auth headers.
  useEffect(() => {
    let cancelled = false;
    cachedFetch<{ data: HealthData }>("/api/admin/health/overview")
      .then((json) => {
        if (cancelled) return;
        setData(json.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [serviceId]);

  const meta = SERVICE_META[serviceId];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200"
      role="region"
      aria-label={`${meta.label} inspection`}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center size-9 rounded-lg shrink-0"
          style={{ backgroundColor: "color-mix(in srgb, var(--action-primary) 16%, transparent)" }}
        >
          <Icon className="h-4 w-4 text-[var(--action-primary)]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{meta.detail}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--bg-surface)] text-[var(--text-muted)] transition-colors"
          aria-label="Close inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        {error ? (
          <p className="text-xs text-[var(--action-danger)]">Failed to load service details: {error}</p>
        ) : (
          <SectionPanel section={meta.section} data={data ?? ({} as HealthData)} loading={loading} />
        )}
      </div>
    </div>
  );
}
