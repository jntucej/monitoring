"use client";
// src/components/sysadmin/backup-maintenance/BackupMaintenanceCenter.tsx
//
// Read-only + controlled action panel for the Backup & Maintenance Center.
// Fetches from /api/sysadmin/backup-maintenance-center and exposes:
//   - backup policy list + recent executions
//   - "Run Backup Now" / "Run Maintenance Now" buttons (POST)
//   - storage inventory
//   - open alerts

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type ExecRow = {
  id: string;
  policy_name: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  artifact_path: string | null;
  artifact_size: number | null;
  checksum_sha256: string | null;
  local_success: boolean;
  error: string | null;
};

type PolicyRow = {
  id: string;
  name: string;
  resource_type: string;
  schedule_cron: string;
  retention_days: number;
  enabled: boolean;
  local_dir: string;
};

type MaintPolicyRow = {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  last_run_at: string | null;
  last_result: string | null;
};

type AlertRow = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
};

type StorageRow = {
  resource_name: string;
  resource_type: string;
  location: string;
  classification: string;
  criticality: string;
  backup_required: boolean;
  estimated_size_bytes: number | null;
};

async function api(path: string, init?: RequestInit) {
  const csrf = document.cookie.match(/__Host-gate_csrf=([^;]+)/)?.[1] ?? "";
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-csrf-token": csrf, ...(init?.headers ?? {}) },
  });
  return res;
}

export function BackupMaintenanceCenter() {
  const { token, role } = useAuth();
  const router = useRouter();

  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [executions, setExecutions] = useState<ExecRow[]>([]);
  const [maintPols, setMaintPols] = useState<MaintPolicyRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [storage, setStorage] = useState<StorageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/api/sysadmin/backup-maintenance-center");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies ?? []);
        setExecutions(data.executions ?? []);
        setMaintPols(data.maintenance_policies ?? []);
        setAlerts(data.alerts ?? []);
        setStorage(data.storage_inventory ?? []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runAction = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      setBusy(true);
      setActionMsg(null);
      try {
        const res = await api("/api/sysadmin/backup-maintenance-center", {
          method: "POST",
          body: JSON.stringify({ action, ...extra }),
        });
        const data = await res.json();
        if (res.ok) {
          setActionMsg(`OK: ${data.message ?? data.status ?? "action completed"}`);
          void load();
        } else {
          setActionMsg(`ERROR: ${data.error ?? data.message ?? res.status}`);
        }
      } catch (err) {
        setActionMsg(`ERROR: ${(err as Error).message}`);
      }
      setBusy(false);
    },
    [load]
  );

  if (role !== "sysadmin" && role !== "admin") {
    return (
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-foreground">
          Backup &amp; Maintenance Center requires sysadmin or admin access.
        </p>
        <button
          onClick={() => router.push("/sysadmin/admin-center")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Go to System Administration
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-sm text-foreground">Loading backup &amp; maintenance data…</span>
      </div>
    );
  }

  const fmtSize = (b: number | null | undefined) =>
    b == null ? "—" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${b} B`;

  const statusColor = (s: string) =>
    s === "completed" || s === "passed"
      ? "text-emerald-400"
      : s === "failed" || s === "critical"
        ? "text-red-400"
        : s === "running" || s === "queued"
          ? "text-amber-400"
          : "text-foreground";

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button
          disabled={busy}
          onClick={() => void runAction("run_backup_now")}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Run Backup Now
        </button>
        <button
          disabled={busy}
          onClick={() => void runAction("run_maintenance_now")}
          className="rounded bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Run Maintenance
        </button>
        <button
          disabled={busy}
          onClick={() => void runAction("verify_latest_backup")}
          className="rounded bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Verify Latest Backup
        </button>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 text-sm text-foreground hover:bg-accent"
        >
          Refresh
        </button>
        {busy && <span className="text-xs text-foreground">Working…</span>}
        {actionMsg && (
          <span className={`text-xs ${actionMsg.startsWith("OK") ? "text-emerald-400" : "text-red-400"}`}>
            {actionMsg}
          </span>
        )}
      </div>

      {/* Open alerts */}
      {alerts.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Open Alerts ({alerts.length})
          </h3>
          <div className="space-y-1 p-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className={`text-xs font-bold ${statusColor(a.severity)}`}>
                  {a.severity.toUpperCase()}
                </span>
                <span className="text-foreground">{a.message}</span>
                <span className="ml-auto text-xs text-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Backup policies */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Backup Policies</h3>
        {policies.length === 0 ? (
          <p className="text-sm text-foreground">
            No backup policies configured yet. Run Backup Now to create the first execution.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Resource</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Schedule</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Retention</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Dir</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{p.name}</td>
                    <td className="px-3 py-2 text-foreground">{p.resource_type}</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{p.schedule_cron}</td>
                    <td className="px-3 py-2 text-foreground">{p.retention_days}d</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{p.local_dir}</td>
                    <td className="px-3 py-2">
                      <span className={p.enabled ? "text-emerald-400" : "text-foreground"}>
                        {p.enabled ? "active" : "disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent executions */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Recent Backup Executions ({executions.length})
        </h3>
        {executions.length === 0 ? (
          <p className="text-sm text-foreground">No executions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Policy</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Started</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Size</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">SHA-256</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{e.policy_name ?? "—"}</td>
                    <td className={`px-3 py-2 font-medium ${statusColor(e.status)}`}>{e.status}</td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {e.started_at ? new Date(e.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground">{fmtSize(e.artifact_size)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {e.checksum_sha256 ? e.checksum_sha256.slice(0, 12) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-red-400">{e.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Maintenance policies */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Maintenance Policies ({maintPols.length})
        </h3>
        {maintPols.length === 0 ? (
          <p className="text-sm text-foreground">No maintenance policies configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Last Run</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Last Result</th>
                </tr>
              </thead>
              <tbody>
                {maintPols.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{p.name}</td>
                    <td className="px-3 py-2 text-foreground">{p.category}</td>
                    <td className={`px-3 py-2 ${p.enabled ? "text-emerald-400" : "text-foreground"}`}>
                      {p.enabled ? "active" : "disabled"}
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {p.last_run_at ? new Date(p.last_run_at).toLocaleString() : "never"}
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">{p.last_result ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Storage inventory */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Storage Inventory ({storage.length})
        </h3>
        {storage.length === 0 ? (
          <p className="text-sm text-foreground">
            No storage resources inventoried yet. Run maintenance to populate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Resource</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Location</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Class</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Criticality</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Size</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Backup</th>
                </tr>
              </thead>
              <tbody>
                {storage.map((s, i) => (
                  <tr key={`${s.resource_name}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{s.resource_name}</td>
                    <td className="px-3 py-2 text-foreground">{s.resource_type}</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{s.location}</td>
                    <td className="px-3 py-2 text-foreground">{s.classification}</td>
                    <td className={`px-3 py-2 ${s.criticality === "critical" ? "text-red-400" : "text-foreground"}`}>
                      {s.criticality}
                    </td>
                    <td className="px-3 py-2 text-foreground">{fmtSize(s.estimated_size_bytes)}</td>
                    <td className={`px-3 py-2 ${s.backup_required ? "text-emerald-400" : "text-foreground"}`}>
                      {s.backup_required ? "required" : "optional"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
