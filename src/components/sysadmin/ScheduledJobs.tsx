"use client";
import { errMsg } from "@/lib/err-msg";

import { useState, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Clock, Play, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface Job {
  id: string;
  name: string;
  description: string;
  cron_expression: string;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
}

interface JobRun {
  id: string;
  job_id: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  start_time: string;
  end_time: string | null;
  error_message: string | null;
}

export function ScheduledJobs() {
const api = useApi();

  const { addToast } = useUIStore();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const headers = api.getHeaders();
      const res = await fetch("/api/admin/jobs", { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setJobs(data.data.jobs || []);
        setRuns(data.data.recentRuns || []);
      }
    } catch {
      // Best effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleToggleJob = async (jobId: string, currentEnabled: boolean) => {
    try {
      const headers = {
        ...api.getHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to toggle job state");

      addToast({ title: "Success", message: `Job ${!currentEnabled ? "enabled" : "disabled"}`, variant: "success" });
      fetchJobs();
    } catch (err) {
      addToast({ title: "Error", message: errMsg(err), variant: "error" });
    }
  };

  const handleRunNow = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const headers = api.getHeaders();
      const res = await fetch(`/api/admin/jobs/${jobId}/run`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to execute job");

      addToast({ title: "Execution Triggered", message: `Job '${jobId}' ran successfully`, variant: "success" });
      fetchJobs();
    } catch (err) {
      addToast({ title: "Run Failed", message: errMsg(err), variant: "error" });
    } finally {
      setRunningJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-surface p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-action-info" /> Scheduled Background Jobs
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Automated maintenance tasks, daily stats generation, and system cleanups
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="surface-card inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-action-info text-white text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Jobs
        </button>
      </div>

      {/* Jobs Table */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="surface-card p-4 bg-bg-elevated/40 font-bold text-xs text-white">
          Active Background Tasks
        </div>
        {loading ? (
          <div className="py-12 text-center text-xs text-text-muted">Loading background jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">No scheduled jobs registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="p-4">Job Name</th>
                  <th className="p-4">Cron Schedule</th>
                  <th className="p-4">Last Run</th>
                  <th className="p-4">State</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-bg-elevated/30 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {job.name}
                      <span className="block text-xs text-text-muted font-normal">{job.description}</span>
                    </td>
                    <td className="p-4 font-mono text-xs text-action-info">{job.cron_expression}</td>
                    <td className="p-4 font-mono text-xs text-text-muted">
                      {job.last_run ? new Date(job.last_run).toLocaleString() : "Never"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleJob(job.id, job.enabled)}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase border transition-all ${
                          job.enabled
                            ? "bg-emerald-500/20 text-action-success border-emerald-500/30"
                            : "bg-bg-elevated0/20 text-text-muted border-border/30"
                        }`}
                      >
                        {job.enabled ? "ENABLED" : "DISABLED"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRunNow(job.id)}
                        disabled={runningJobId === job.id}
                        className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-action-info text-white font-bold text-xs disabled:opacity-50"
                      >
                        <Play className={`size-3.5 ${runningJobId === job.id ? "animate-spin" : ""}`} /> Run Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Runs Table */}
      <div className="surface-card bg-bg-surface p-6 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-unit-c" /> Execution History (Last 10 Runs)
        </h3>
        {runs.length === 0 ? (
          <div className="surface-card py-6 text-center text-xs text-text-muted">
            No recent job executions recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="pb-2">Job ID</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-2.5 font-mono text-white font-bold">{r.job_id}</td>
                    <td className="py-2.5">
                      {r.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 text-action-success font-bold text-xs">
                          <CheckCircle2 className="size-3.5" /> SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-action-danger font-bold text-xs">
                          <XCircle className="size-3.5" /> FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-xs text-text-muted">
                      {new Date(r.start_time).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right text-xs text-text-muted">
                      {r.error_message || "Completed in < 5s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
