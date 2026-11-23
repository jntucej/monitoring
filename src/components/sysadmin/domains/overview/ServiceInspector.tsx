"use client";

import { useEffect, useState } from "react";
import { Database, Server, Cpu, HardDrive, Globe, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { cachedFetch } from "@/hooks/useApiResource";
import { EntityInspector, KVPairs, InspectorButton, Timeline, type EntityInspection } from "@/components/shared/EntityInspector";
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

/**
 * ServiceInspector — the sysadmin service-node inspector.
 *
 * Renders the shared `EntityInspector` drawer (not an inline card) with a
 * standardized `EntityInspection` model for the selected service, so the
 * service topology click exposes the same progressive-disclosure hierarchy
 * every other record in the app uses:
 *
 *   overview (status + key metric) → context (24h trend / pool / queue)
 *   → actions (jump to the matching health page).
 *
 * Data is lazy-loaded from `/api/admin/health/overview` via `cachedFetch`
 * (the same fetcher the dashboard uses); the model is built locally from
 * the response so no new API surface is required. Loading / error / not-
 * found states are exposed through the inspector's state placeholders.
 */

function serviceInspectionModel(
  serviceId: string,
  data: HealthData | null,
  health: string | undefined,
): EntityInspection {
  const meta = SERVICE_META[serviceId];
  const Icon = meta?.icon ?? Server;
  const label = meta?.label ?? serviceId;
  const detail = meta?.detail ?? "";
  const state = health?.toLowerCase() ?? "unknown";
  const tone: "ok" | "warn" | "danger" | "neutral" =
    state === "ok" || state === "online" ? "ok"
    : state === "warn" || state === "degraded" ? "warn"
    : state === "error" || state === "offline" || state === "unhealthy" ? "danger"
    : "neutral";

  const toneClass: Record<string, string> = {
    ok: "bg-emerald-500/15 text-action-success",
    warn: "bg-amber-500/15 text-action-warning",
    danger: "bg-rose-500/15 text-action-danger",
    neutral: "bg-bg-elevated text-text-muted",
  };

  // ── overview KVPairs (section 1) ───────────────────────────────────────
  const overviewItems: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Status",
      value: (
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${toneClass[tone]}`}>
          {state.toUpperCase()}
        </span>
      ),
    },
  ];
  if (meta?.section === "app") {
    const rate = data?.app?.errorRate24h ?? [];
    const avg = rate.length ? rate.reduce((a, b) => a + b, 0) / rate.length : 0;
    overviewItems.push({ label: "24h avg error rate", value: `${(avg * 100).toFixed(2)}%` });
  } else if (meta?.section === "database") {
    if (data?.database) {
      overviewItems.push({ label: "Active connections", value: String(data.database.conns) });
      overviewItems.push({ label: "Pool slots", value: String(data.database.pool) });
    }
  } else if (meta?.section === "redis") {
    if (data?.redis) {
      overviewItems.push({
        label: "Worker",
        value: data.redis.worker_healthy ? "Healthy" : "Degraded",
      });
      overviewItems.push({ label: "Queue depth", value: String(data.redis.queue_depth) });
    }
  }

  // ── context (section 2, collapsible where it is long) ──────────────────
  const contextItems: Array<{ label: string; value: React.ReactNode }> = [];
  if (meta?.section === "app") {
    const rate = data?.app?.errorRate24h ?? [];
    contextItems.push({
      label: "Last 5 samples",
      value: rate.length
        ? rate.slice(-5).map((v) => `${Math.round(v * 100)}%`).join(" · ")
        : "—",
    });
  }
  if (meta?.section === "database" && data?.database) {
    contextItems.push({ label: "Section", value: "database" });
  }
  if (meta?.section === "redis" && data?.redis) {
    contextItems.push({ label: "Section", value: "redis" });
  }

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: <KVPairs items={overviewItems} columns={1} />,
    },
    ...(contextItems.length
      ? [{
          title: "Context",
          collapsible: true,
          content: <KVPairs items={contextItems} columns={1} />,
        }]
      : []),
    {
      title: "Service detail",
      content: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center size-6 rounded-lg"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--action-primary) 16%, transparent)",
              }}
            >
              <Icon className="h-3.5 w-3.5 text-action-primary" />
            </span>
            <p className="text-sm font-semibold text-text-primary">{label}</p>
          </div>
          <p className="text-xs text-text-muted">{detail}</p>
          {!data ? (
            <p className="text-xs text-text-muted">Health data not loaded yet.</p>
          ) : null}
        </div>
      ),
    },
    {
      title: "Timeline",
      collapsible: true,
      content: (
        <Timeline
          items={[
            {
              label: "Service health",
              detail: state.toUpperCase(),
              tone,
            },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="flex flex-wrap gap-2">
          <InspectorButton href="/sysadmin/health" variant="primary">
            <ChevronRight className="size-3.5" /> Full health dashboard
          </InspectorButton>
        </div>
      ),
    },
  ];

  return {
    kind: "service",
    title: label,
    subtitle: serviceId,
    status: (
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${toneClass[tone]}`}>
        {state.toUpperCase()}
      </span>
    ),
    sections,
    detailHref: "/sysadmin/health",
    detailLabel: "Open health dashboard",
  };
}

export function ServiceInspector({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load health details on mount; cachedFetch handles auth headers.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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

  // While the health payload is still in flight or failed, surface the
  // state through the inspector's built-in placeholder (design rule 31:
  // the inspector never shows a blank panel).
  const health = undefined;
  const model = data
    ? serviceInspectionModel(serviceId, data, health)
    : null;

  if (error) {
    return (
      <EntityInspector
        inspection={null}
        onClose={onClose}
        state="error"
        errorMessage={error}
      />
    );
  }
  if (loading || !model) {
    return (
      <EntityInspector inspection={null} onClose={onClose} state="loading" />
    );
  }

  return <EntityInspector inspection={model} onClose={onClose} />;
}

