"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Container,
  Clock,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  CheckCircle,
  XCircle,
  Server,
  GitBranch,
  Moon,
  FileWarning,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

// ── Types ──────────────────────────────────────────────────────────────────

interface ContainerInfo {
  name: string;
  running: boolean;
  status: string;
}

interface ContainerHealth {
  total?: number;
  running?: number;
  list?: ContainerInfo[];
  error?: string;
}

interface GateJobResult {
  name: string;
  status: number;
  ok: boolean;
}

interface GateJobEntry {
  timestamp?: string;
  healthy?: boolean;
  results?: GateJobResult[];
  error?: string;
}

interface Finding {
  id: string;
  title: string;
  severity: string;
  status: string;
}

interface FindingsSummary {
  total?: number;
  byStatus?: Record<string, number>;
  bySeverity?: Record<string, number>;
  active?: Finding[];
  error?: string;
}

interface DeploymentState {
  commit?: string;
  image?: string;
  state?: string;
  error?: string;
}

interface BackupHealth {
  timestamp?: string;
  ok?: boolean;
  latest?: string;
  ageHours?: number;
  error?: string;
}

interface ModeEvent {
  mode?: string;
  timestamp?: string;
  error?: string;
}

interface AutonomousData {
  containers?: ContainerHealth;
  gateJobs?: GateJobEntry;
  findings?: FindingsSummary;
  deployment?: DeploymentState;
  backup?: BackupHealth;
  gateMode?: ModeEvent;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "default" | "ok" | "warn" | "error";
  subtitle?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "border-border text-text-primary",
    ok: "border-action-success/30 text-action-success",
    warn: "border-action-warning/30 text-action-warning",
    error: "border-action-danger/30 text-action-danger",
  };
  return (
    <div className={cn("surface-card p-4", toneClasses[tone])}>
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor autonomous for campus operations."
        contextLabel="Autonomous"
        statusSummary="Review current autonomous state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 opacity-60" />
        <div>
          <p className="text-xs text-text-muted">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ ok: okState, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          okState ? "bg-action-success" : "bg-action-danger"
        )}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function sevClass(sev: string): string {
  switch (sev) {
    case "P0": return "bg-action-danger/15 text-action-danger";
    case "P1": return "bg-action-warning/15 text-action-warning";
    case "P2": return "bg-action-warning/15 text-action-warning";
    case "P3": return "bg-action-info/15 text-action-info";
    default:   return "bg-surface-raised text-text-muted";
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

function AutonomousInner() {
  const [data, setData] = useState<AutonomousData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sysadmin/autonomous-monitoring", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: { success: boolean; data: AutonomousData } = await res.json();
      setData(json.data ?? json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <EmptyState title="Failed to load" description={error} />;
  }

  const containers = data?.containers;
  const gateJobs = data?.gateJobs;
  const findings = data?.findings;
  const deployment = data?.deployment;
  const backup = data?.backup;
  const gateMode = data?.gateMode;

  const containerOk = containers?.running === containers?.total;
  const gateJobsOk = gateJobs?.healthy !== false;
  const findingsActive = findings?.active?.length ?? 0;
  const backupOk = backup?.ok !== false;
  const hasDeploy = deployment?.commit && !deployment?.error;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Autonomous Monitoring</h1>
          <p className="text-sm text-text-muted">
            Live view of the error-hunter cron stack, container health, findings,
            deployment state, and backup verification.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Containers"
          value={containers ? `${containers.running}/${containers.total}` : "—"}
          subtitle={containerOk ? "All running" : "Some down"}
          icon={Container}
          tone={containerOk ? "ok" : "error"}
        />
        <StatCard
          title="Gate Jobs"
          value={gateJobsOk ? "13/13" : "Failing"}
          subtitle={gateJobs?.timestamp ? "Last check" : "No data"}
          icon={Clock}
          tone={gateJobsOk ? "ok" : "error"}
        />
        <StatCard
          title="Active Findings"
          value={findingsActive}
          subtitle={findings?.total ? `${findings.total} total` : ""}
          icon={AlertTriangle}
          tone={findingsActive > 0 ? "warn" : "ok"}
        />
        <StatCard
          title="Backup"
          value={backupOk ? "OK" : "FAIL"}
          subtitle={backup?.latest ? `Latest: ${backup.latest}` : ""}
          icon={HardDrive}
          tone={backupOk ? "ok" : "error"}
        />
      </div>

      {/* Container list */}
      {containers?.list && containers.list.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Containers ({containers.running}/{containers.total} running)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {containers.list.map((c) => (
              <StatusDot key={c.name} ok={c.running} label={c.name} />
            ))}
          </div>
        </div>
      )}

      {/* Gate jobs detail */}
      {gateJobs?.results && gateJobs.results.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Gate Job Endpoints
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {gateJobs.results.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-sm">
                {r.ok ? (
                  <CheckCircle className="h-4 w-4 text-action-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-action-danger" />
                )}
                <span className={cn(r.ok ? "text-text-primary" : "text-action-danger")}>
                  {r.name}
                </span>
                <span className="ml-auto text-xs text-text-muted">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      {findings && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Findings ({findings.total} total, {findingsActive} active)
          </h3>
          {findings.bySeverity && (
            <div className="flex gap-4 mb-3">
              {Object.entries(findings.bySeverity).map(([sev, count]) => (
                <span
                  key={sev}
                  className={cn("text-xs px-2 py-0.5 rounded-full", sevClass(sev))}
                >
                  {sev}: {count}
                </span>
              ))}
            </div>
          )}
          {findings.active && findings.active.length > 0 && (
            <div className="space-y-1">
              {findings.active.slice(0, 10).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 text-sm py-1 border-b border-border last:border-0"
                >
                  <span className="text-xs font-mono text-text-muted">{f.id}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", sevClass(f.severity))}>
                    {f.severity}
                  </span>
                  <span className="flex-1 truncate">{f.title}</span>
                  <span className="text-xs text-text-muted">{f.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deployment + Gate Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Deployment
          </h3>
          {hasDeploy ? (
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-text-muted">Commit:</span>{" "}
                <code className="text-xs">{deployment!.commit?.slice(0, 8)}</code>
              </p>
              <p>
                <span className="text-text-muted">Image:</span>{" "}
                <code className="text-xs">{deployment!.image?.slice(0, 20)}...</code>
              </p>
              <p>
                <span className="text-text-muted">State:</span>{" "}
                <span className="font-medium">{deployment!.state}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              {deployment?.error ?? "No deployment data"}
            </p>
          )}
        </div>

        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Gate Mode
          </h3>
          {gateMode?.mode ? (
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-text-muted">Current:</span>{" "}
                <span className="font-medium">{gateMode.mode}</span>
              </p>
              {gateMode.timestamp && (
                <p className="text-xs text-text-muted">
                  Since: {new Date(gateMode.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              {gateMode?.error ?? "No mode data"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AutonomousPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<div className="p-4"><Skeleton className="h-64 w-full" /></div>}>
        <WidgetBoundary>
          <AutonomousInner />
        </WidgetBoundary>
      </Suspense>
    </AuthGuard>
  );
}
