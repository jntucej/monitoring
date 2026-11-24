"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock, Clock,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import {
  SysAdminTraceDrawer,
  type SysAdminTraceTarget,
} from "@/components/nav/level4/SysAdminTraceDrawer";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface JobRow {
  id: string;
  name: string;
  description: string | null;
  cron_expression: string | null;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
}

interface RunRow {
  id: string;
  scheduledJobs_id: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_ms: number | null;
  records_affected: number | null;
  triggered_by: string | null;
  error_message: string | null;
}

function fmtLocal(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildJobTrace(
  job: JobRow,
  runs: RunRow[],
): SysAdminTraceTarget {
  const jobRuns = runs.filter((r) => r.scheduledJobs_id === job.id);
  const lastRun = jobRuns[0] ?? null;
  return {
    entityType: "job",
    identifier: job.id,
    label: job.name,
    diagnostics: [
      { label: "schedule", value: job.cron_expression ?? "—" },
      { label: "enabled", value: job.enabled ? "yes" : "no" },
      { label: "last run", value: fmtLocal(job.last_run) },
      {
        label: "next run",
        value: job.next_run
          ? new Date(job.next_run).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      },
      { label: "recent runs", value: String(jobRuns.length) },
      {
        label: "last status",
        value: lastRun?.status ?? "—",
      },
    ],
    traceRoutes: [
      { label: "cron jobs", href: "/sysadmin/cron" },
      { label: "audit", href: "/sysadmin/audit" },
    ],
  };
}

/**
 * Sysadmin Cron / Scheduled Jobs — job list + recent run history.
 * Backend: /api/admin/scheduled-jobs (sysadmin|admin scope; { rows, runs }).
 * L4 trace drawer: clicking a job row opens the record-trace drawer with
 * schedule + last-run diagnostics and deep links into canonical routes.
 */
function SysadminCronInner() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scheduled-jobs", { headers: getAuthHeaders() });
      const body = await res.json();
      setJobs((body?.data?.rows ?? body?.rows ?? []) as JobRow[]);
      setRuns((body?.data?.runs ?? body?.runs ?? []) as RunRow[]);
    } catch (e) {
      console.error("cron", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor scheduled jobs for campus operations."
        contextLabel="Scheduled Jobs"
        statusSummary="Review current scheduled jobs state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const statusTone = (s: string) => {
    if (s === "success" || s === "completed") return "bg-emerald-500/15 text-action-success";
    if (s === "failed" || s === "error") return "bg-rose-500/15 text-action-danger";
    if (s === "running") return "bg-action-primary/15 text-action-primary";
    return "bg-bg-elevated text-text-muted";
  };

  const trace: SysAdminTraceTarget | null = selectedJob
    ? buildJobTrace(selectedJob, runs)
    : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Scheduled Jobs"
        subtitle={`${jobs.length} cron jobs · ${runs.length} recent runs`}
        onRefresh={load}
      />

      <WidgetBoundary title="Jobs">
        <div className="glass-card">
          {jobs.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="w-6 h-6" />}
              title="No scheduled jobs"
              description="Jobs appear here once they are registered."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-border">
                    <th className="p-3 text-left">Job</th>
                    <th className="p-3 text-left">Cron</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-left">Last run</th>
                    <th className="p-3 text-left">Next run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((j) => (
                    <tr
                      key={j.id}
                      onClick={() => setSelectedJob(j)}
                      className="hover:bg-bg-elevated/40 cursor-pointer"
                    >
                      <td className="p-3">
                        <p className="text-sm font-medium text-text-primary">{j.name}</p>
                        {j.description && <p className="text-xs text-text-muted mt-0.5">{j.description}</p>}
                      </td>
                      <td className="p-3 font-mono text-xs text-text-muted">{j.cron_expression ?? "—"}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${j.enabled ? "bg-emerald-500/15 text-action-success" : "bg-bg-elevated text-text-muted"}`}>
                          {j.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-text-muted">
                        {fmtLocal(j.last_run)}
                      </td>
                      <td className="p-3 text-xs text-text-muted">
                        {j.next_run
                          ? new Date(j.next_run).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Recent runs">
        <div className="glass-card">
          {runs.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="No recent runs"
              description="Run history appears here after the first execution."
            />
          ) : (
            <div className="divide-y divide-border">
              {runs.map((r) => (
                <div key={r.id} className="p-3 flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${statusTone(r.status)}`}>
                    {r.status}
                  </span>
                  <p className="flex-1 text-xs text-text-muted">
                    {r.scheduledJobs_id ?? "job"}
                    {r.records_affected != null ? ` · ${r.records_affected} records` : ""}
                    {r.duration_ms != null ? ` · ${r.duration_ms}ms` : ""}
                  </p>
                  <span className="text-xs text-text-muted font-mono">
                    {r.start_time ? new Date(r.start_time).toLocaleTimeString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <SysAdminTraceDrawer
        trace={trace}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}

export default function SysadminCronPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <SysadminCronInner />
    </AuthGuard>
  );
}
