"use client";

/**
 * CommandCenterContent — the body of the sysadmin Command Center.
 *
 * Renders the three-region cockpit from the overview payload:
 *   1. Status hero  — overall health dot + label + MFA / backup readouts.
 *   2. KPI tiles    — 4 headline numbers (grid 2-up / 4-up).
 *   3. Topology     — live service FlowMap (click → /sysadmin/health?service=).
 *   4. Attention queue — derived actionable items, or a "nominal" state.
 *
 * Purely presentational: the layout's `useDashboardData` owns fetching;
 * `onRefresh` is threaded back to the PageHeader refresh button.
 */
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Inbox,
  Bell as BellIcon,
  Activity,
  Database,
  Server,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowMap } from "@/components/sysadmin/kit/viz";
import { MiniSparkline } from "@/components/sysadmin/kit/sidebar";
import type { CommandCenterData } from "./types";

export interface CommandCenterContentProps {
  data: CommandCenterData | null;
  onRefresh: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────

/** "ok" if none bad, "warn" if only warn/degraded, "error" if any error/offline. */
function overallStatus(health: string[]): "ok" | "warn" | "error" {
  let level: "ok" | "warn" | "error" = "ok";
  for (const h of health) {
    const s = h.toLowerCase();
    if (s === "error" || s === "offline" || s === "unhealthy") {
      return "error";
    }
    if (s === "warn" || s === "degraded") level = "warn";
  }
  return level;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const STATUS_COLOR: Record<"ok" | "warn" | "error", string> = {
  ok: "var(--action-primary)",
  warn: "var(--action-warning)",
  error: "var(--action-danger)",
};

const STATUS_LABEL: Record<"ok" | "warn" | "error", string> = {
  ok: "All systems operational",
  warn: "Degraded performance",
  error: "Outage in progress",
};

// ── KPI tile ──────────────────────────────────────────────────────────────

interface KpiTile {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "warn" | "error";
  href?: string;
  spark?: number[];
}

function KpiCard({ tile }: { tile: KpiTile }) {
  const tone = tile.tone ?? "ok";
  const toneColor =
    tone === "error"
      ? "var(--action-danger)"
      : tone === "warn"
        ? "var(--action-warning)"
        : "var(--action-primary)";

  const body = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center justify-center size-8 rounded-lg shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${toneColor} 16%, transparent)`,
            }}
          >
            <tile.icon
              className="h-4 w-4"
              // eslint-disable-next-line @typescript-eslint/no-base-to-string
            />
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)] truncate">
            {tile.label}
          </span>
        </div>
        {tile.spark && tile.spark.length > 1 && (
          <MiniSparkline
            label={`${tile.label} trend`}
            values={tile.spark}
            color={toneColor}
            width={40}
            height={14}
            className="shrink-0"
          />
        )}
      </div>
      <div
        className="text-2xl font-semibold tracking-tight"
        style={{ color: tile.tone ? toneColor : "var(--text-primary)" }}
      >
        {tile.value}
      </div>
      {tile.hint && (
        <div className="text-[11px] text-[var(--text-muted)] -mt-1">
          {tile.hint}
        </div>
      )}
    </div>
  );

  return tile.href ? (
    <Link
      href={tile.href}
      className="block hover:ring-2 hover:ring-[var(--action-primary)]/30 rounded-2xl transition-shadow"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

// ── main ──────────────────────────────────────────────────────────────────

export function CommandCenterContent({ data }: CommandCenterContentProps) {
  if (!data) return null;
  const health = data.command?.health ?? [];
  const status = overallStatus(health);
  const backup = data.data?.backupFreshness ?? 0;

  const errorAvg = avg(data.monitoring?.errorRate24h ?? []);
  const openAlerts =
    (data.alerts?.critical ?? 0) +
    (data.alerts?.high ?? 0) +
    (data.alerts?.medium ?? 0) +
    (data.alerts?.low ?? 0);
  const pendingApprovals = data.counts?.["access"] ?? 0;
  const driftCount =
    (data.platform?.envDrift ?? 0) + (data.platform?.schemaDrift ?? 0);

  // ── KPI tiles
  const tiles: KpiTile[] = [
    {
      id: "users",
      label: "Active users",
      value: data.identity?.active ?? 0,
      hint: `${data.identity?.suspended ?? 0} suspended`,
      icon: Users,
      href: "/sysadmin/people",
      tone: "ok",
    },
    {
      id: "approvals",
      label: "Pending approvals",
      value: pendingApprovals,
      hint: pendingApprovals > 0 ? "Action required" : "Inbox clear",
      icon: Inbox,
      href: "/sysadmin/access",
      tone: pendingApprovals > 0 ? "warn" : "ok",
    },
    {
      id: "alerts",
      label: "Open alerts",
      value: openAlerts,
      hint: `${data.alerts?.critical ?? 0} critical`,
      icon: BellIcon,
      href: "/sysadmin/alerts",
      tone:
        (data.alerts?.critical ?? 0) > 0
          ? "error"
          : (data.alerts?.high ?? 0) > 0
            ? "warn"
            : "ok",
    },
    {
      id: "errors",
      label: "Error rate 24h",
      value: `${errorAvg.toFixed(1)}%`,
      hint: "avg hourly",
      icon: Activity,
      href: "/sysadmin/health",
      tone: errorAvg > 5 ? "warn" : "ok",
      spark: data.monitoring?.errorRate24h,
    },
  ];

  // ── Service topology (map health[i] onto the known service set)
  const serviceNames = ["caddy", "web", "postgres", "redis", "worker"];
  const nodes = serviceNames.map((id, i) => ({
    id,
    label: id,
    status: (health[i] ?? "ok") as
      | "ok"
      | "warn"
      | "error"
      | "info"
      | "neutral",
  }));
  const edges = [
    { from: "caddy", to: "web" },
    { from: "web", to: "postgres", latencyMs: 4 },
    { from: "web", to: "redis", latencyMs: 2 },
    { from: "worker", to: "postgres", latencyMs: 12 },
  ];

  // ── Attention queue (derived, most-severe first)
  type Item = {
    id: string;
    title: string;
    detail: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    tone: "error" | "warn" | "ok";
    href: string;
  };
  const items: Item[] = [];
  if ((data.data?.backupFreshness ?? 1) < 0.5) {
    items.push({
      id: "backup",
      title: "Backup is stale",
      detail: `Latest backup freshness ${Math.round((data.data?.backupFreshness ?? 0) * 100)}%`,
      icon: Database,
      tone: "warn",
      href: "/sysadmin/backup",
    });
  }
  if ((data.alerts?.critical ?? 0) > 0) {
    items.push({
      id: "crit",
      title: "Critical alerts open",
      detail: `${data.alerts.critical} critical ${openAlerts > data.alerts.critical ? `· ${openAlerts} total` : ""}`,
      icon: AlertTriangle,
      tone: "error",
      href: "/sysadmin/alerts",
    });
  }
  if (driftCount > 0) {
    items.push({
      id: "drift",
      title: "Configuration drift",
      detail: `${driftCount} ${driftCount === 1 ? "diff" : "diffs"} across env/schema`,
      icon: ShieldAlert,
      tone: "warn",
      href: "/sysadmin/system",
    });
  }

  const toneColor = STATUS_COLOR[status];

  return (
    <div className="space-y-6">
      {/* ── Status hero */}
      <section
        aria-label="System status"
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className="inline-flex items-center justify-center size-11 rounded-xl shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${toneColor} 18%, transparent)`,
            }}
          >
            {status === "error" ? (
              <XCircle className="h-5 w-5" style={{ color: toneColor }} />
            ) : status === "warn" ? (
              <AlertTriangle className="h-5 w-5" style={{ color: toneColor }} />
            ) : (
              <CheckCircle2 className="h-5 w-5" style={{ color: toneColor }} />
            )}
          </span>
          <div className="min-w-0">
            <p
              className="text-lg font-semibold tracking-tight truncate"
              style={{ color: toneColor }}
            >
              {STATUS_LABEL[status]}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
              {health.length || 0} services · {STATUS_LABEL[status].toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: backup < 0.5 ? "var(--action-danger)" : "var(--action-primary)" }}
            />
            Backup freshness {Math.round(backup * 100)}%
          </span>
        </div>
      </section>

      {/* ── KPI tiles */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {tiles.map((t) => (
          <KpiCard key={t.id} tile={t} />
        ))}
      </section>

      {/* ── Topology + attention queue */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section
          aria-label="Service topology"
          className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Service topology
            </h2>
            <span className="text-[11px] text-[var(--text-muted)] ml-auto">
              click a node to inspect
            </span>
          </div>
          <FlowMap
            nodes={nodes}
            edges={edges}
            height={220}
            onNodeClick={(id) => {
              window.location.href = `/sysadmin/health?service=${encodeURIComponent(id)}`;
            }}
          />
        </section>

        <section
          aria-label="Attention queue"
          className="lg:col-span-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Attention
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-[var(--action-primary)] mb-3" />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                All systems nominal
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Nothing needs attention right now.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => {
                const c =
                  it.tone === "error"
                    ? "var(--action-danger)"
                    : it.tone === "warn"
                      ? "var(--action-warning)"
                      : "var(--action-primary)";
                return (
                  <li key={it.id}>
                    <Link
                      href={it.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-[var(--border)] p-3",
                        "hover:border-[var(--action-primary)]/40 hover:bg-[var(--bg-elevated)] transition-colors"
                      )}
                    >
                      <span
                        className="inline-flex items-center justify-center size-8 rounded-lg shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${c} 16%, transparent)`,
                        }}
                      >
                        <it.icon className="h-4 w-4" style={{ color: c }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--text-primary)] truncate">
                          {it.title}
                        </span>
                        <span className="block text-[11px] text-[var(--text-muted)] truncate">
                          {it.detail}
                        </span>
                      </span>
                      <ChevronLink />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ChevronLink() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
