"use client";
// /sysadmin/backup-maintenance
// Hardware-aware Backup & Maintenance Center.
// Reads: /api/sysadmin/storage-devices, /api/sysadmin/backup-repo,
//        /api/sysadmin/backup-maintenance-center
// Posts: register device, set primary, backup_now, run_maintenance_now

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Device = {
  id: string;
  device_name: string;
  device_model: string | null;
  device_serial: string | null;
  device_type: string;
  mount_point: string;
  filesystem: string | null;
  total_bytes: number | null;
  available_bytes: number | null;
  last_seen_at: string;
  is_primary_backup: boolean;
  eligible_for_backup: boolean;
  read_writable: boolean;
  health_status: string;
  last_backup_at: string | null;
  last_verify_at: string | null;
  notes: string | null;
};

type Snapshot = {
  id: string;
  snapshot_id: string;
  repository_path: string;
  tag: string | null;
  time: string | null;
  stats_json: Record<string, number>;
  checksum_verified: boolean;
  device_name: string | null;
  mount_point: string | null;
  health_status: string | null;
};

type Manifest = {
  id: string;
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  critical_ok: boolean;
  important_ok: boolean;
  resources_total: number;
  resources_ok: number;
  resources_failed: number;
  total_bytes: number;
  dedup_ratio: number | null;
  resource_details: { name: string; category: string; status: string; error: string | null }[];
};

type MaintPolicy = {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  last_run_at: string | null;
  last_result: string | null;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + " TB";
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + " MB";
  return n + " B";
}

function healthColor(s: string): string {
  switch (s) {
    case "healthy":  return "text-action-success";
    case "degraded": return "text-action-warning";
    case "error":    return "text-action-danger";
    case "disconnected": return "text-foreground";
    default: return "text-foreground";
  }
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const csrf = document.cookie.match(/__Host-gate_csrf=([^;]+)/)?.[1] ?? "";
  return fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-csrf-token": csrf, ...(init?.headers ?? {}) },
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BackupMaintenancePage() {
  const { role, authenticated } = useAuth();
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [maintPols, setMaintPols] = useState<MaintPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Register form state
  const [regName, setRegName] = useState("WD My Passport");
  const [regModel, setRegModel] = useState("WDC WD20JDRW-11C7VS1");
  const [regSerial, setRegSerial] = useState("WD-WX22AC5AFYLK");
  const [regType, setRegType] = useState("usb_hdd");
  const [regMount, setRegMount] = useState("/mnt/external-logs");
  const [regFs, setRegFs] = useState("ntfs");
  const [regTotal, setRegTotal] = useState("1907949385728");
  const [regAvail, setRegAvail] = useState("1907949385728");
  const [regPrimary, setRegPrimary] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [devRes, repoRes, centerRes] = await Promise.all([
        api("/api/sysadmin/storage-devices"),
        api("/api/sysadmin/backup-repo"),
        api("/api/sysadmin/backup-maintenance-center"),
      ]);
      if (devRes.ok) setDevices((await devRes.json()).devices ?? []);
      if (repoRes.ok) {
        const d = await repoRes.json();
        setSnapshots(d.snapshots ?? []);
        setManifests(d.manifests ?? []);
      }
      if (centerRes.ok) setMaintPols((await centerRes.json()).maintenance_policies ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const post = useCallback(async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await api(path, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ ok: true, text: data.message ?? `OK: ${data.status ?? "action completed"}` });
        void load();
      } else {
        setActionMsg({ ok: false, text: data.error ? `${data.error}: ${data.message ?? ""}` : `HTTP ${res.status}` });
      }
    } catch (err) {
      setActionMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }, [load]);

  if (!authenticated || (role !== "sysadmin" && role !== "admin")) {
    return (
      <div className="p-6">
        <p className="text-sm text-foreground">Backup &amp; Maintenance requires sysadmin or admin access.</p>
        <button onClick={() => router.push("/sysadmin/admin-center")} className="mt-2 text-sm text-primary hover:underline">
          Go to System Administration →
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-foreground">Loading backup infrastructure…</span>
      </div>
    );
  }

  const primary = devices.find((d) => d.is_primary_backup);

  return (
    <div className="space-y-6 p-4">
      {/* Header + action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Backup &amp; Maintenance Center</h1>
          <p className="text-xs text-foreground">
            Primary destination:{" "}
            {primary ? (
              <span className="text-foreground font-medium">{primary.device_name} ({primary.mount_point})</span>
            ) : (
              <span className="text-foreground font-medium">none registered</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => void post("/api/sysadmin/backup-repo", { action: "backup_now" })}
            className="bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            ▶ Backup Now
          </button>
          <button
            disabled={busy}
            onClick={() => void post("/api/sysadmin/backup-maintenance-center", { action: "run_maintenance_now" })}
            className="bg-muted px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            Run Maintenance
          </button>
          <button
            onClick={() => void load()}
            className="bg-muted px-3 py-2 text-sm text-foreground hover:bg-accent"
          >
            Refresh
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`px-3 py-2 text-sm ${actionMsg.ok ? "bg-action-success/10 text-action-success" : "bg-action-danger/10 text-action-danger"}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Storage Devices */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Storage Devices</h2>
          <button
            onClick={() => setShowRegister(!showRegister)}
            className="text-xs text-primary hover:underline"
          >
            {showRegister ? "Cancel" : "+ Register Device"}
          </button>
        </div>

        {showRegister && (
          <div className="mb-3 grid grid-cols-2 gap-2 p-3 text-sm md:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Name
              <input value={regName} onChange={(e) => setRegName(e.target.value)}
                className="px-2 py-1 text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Mount Point
              <input value={regMount} onChange={(e) => setRegMount(e.target.value)}
                className="px-2 py-1 font-mono text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Device Type
              <select value={regType} onChange={(e) => setRegType(e.target.value)}
                className="px-2 py-1 text-foreground">
                <option value="usb_hdd">USB HDD</option>
                <option value="usb_ssd">USB SSD</option>
                <option value="internal_sata">Internal SATA</option>
                <option value="internal_nvme">Internal NVMe</option>
                <option value="nas_nfs">NAS NFS</option>
                <option value="nas_smb">NAS SMB</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Filesystem
              <input value={regFs} onChange={(e) => setRegFs(e.target.value)}
                className="px-2 py-1 font-mono text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Total Bytes
              <input value={regTotal} onChange={(e) => setRegTotal(e.target.value)}
                className="px-2 py-1 font-mono text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Available Bytes
              <input value={regAvail} onChange={(e) => setRegAvail(e.target.value)}
                className="px-2 py-1 font-mono text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Model
              <input value={regModel} onChange={(e) => setRegModel(e.target.value)}
                className="px-2 py-1 font-mono text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Serial
              <input value={regSerial} onChange={(e) => setRegSerial(e.target.value)}
                className="px-2 py-1 font-mono text-foreground" />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-1 text-xs text-foreground">
                <input type="checkbox" checked={regPrimary} onChange={(e) => setRegPrimary(e.target.checked)} />
                Primary
              </label>
              <button
                disabled={busy}
                onClick={() => {
                  void post("/api/sysadmin/storage-devices", {
                    action: "register",
                    device: {
                      device_name: regName,
                      device_model: regModel || null,
                      device_serial: regSerial || null,
                      device_type: regType,
                      mount_point: regMount,
                      filesystem: regFs || null,
                      total_bytes: Number(regTotal) || null,
                      available_bytes: Number(regAvail) || null,
                      is_primary_backup: regPrimary,
                    },
                  });
                  setShowRegister(false);
                }}
                className="bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Register
              </button>
            </div>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-sm text-foreground">No storage devices registered. Register your backup hardware above.</p>
        ) : (
          <div className="divide-y divide-border">
            {devices.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-4 py-3">
                {/* Device info */}
                <div className="flex-1 min-w-40">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{d.device_name}</span>
                    {d.is_primary_backup && (
                      <span className="bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">PRIMARY</span>
                    )}
                    <span className={`text-xs ${healthColor(d.health_status)}`}>● {d.health_status}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-foreground">
                    {d.device_model ?? "unknown model"} · {d.mount_point} · {d.filesystem ?? "?"} · {d.device_type}
                  </div>
                  {d.device_serial && (
                    <div className="text-[10px] font-mono text-foreground">SN: {d.device_serial}</div>
                  )}
                </div>
                {/* Capacity */}
                <div className="text-right">
                  <div className="text-sm text-foreground">{fmtBytes(d.available_bytes)}</div>
                  <div className="text-xs text-foreground">free of {fmtBytes(d.total_bytes)}</div>
                </div>
                {/* Backup status */}
                <div className="text-right text-xs">
                  <div className={d.eligible_for_backup ? "text-action-success" : "text-foreground"}>
                    {d.eligible_for_backup ? "backup eligible" : "excluded"}
                  </div>
                  <div className="text-foreground">
                    last backup: {d.last_backup_at ? new Date(d.last_backup_at).toLocaleString() : "never"}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-1">
                  {!d.is_primary_backup && (
                    <button
                      onClick={() => void post("/api/sysadmin/storage-devices", { action: "set_primary", device_id: d.id })}
                      className="bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => void post("/api/sysadmin/storage-devices", { action: "remove_registration", device_id: d.id })}
                    className="border border-action-danger/30 px-2 py-1 text-xs text-action-danger hover:bg-action-danger/10"
                  >
                    Deregister
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Backup Manifests (one-click backup history) */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Backup History ({manifests.length})
        </h2>
        {manifests.length === 0 ? (
          <p className="text-sm text-foreground">No backup runs yet. Click "Backup Now" to start.</p>
        ) : (
          <div className="space-y-2">
            {manifests.map((m) => (
              <div key={m.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-bold ${
                    m.status === "completed" ? "text-action-success" :
                    m.status === "partial"   ? "text-action-warning" :
                    m.status === "failed"    ? "text-action-danger" : "text-foreground"
                  }`}>
                    {m.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-foreground">{m.run_id}</span>
                  <span className="text-xs text-foreground">
                    {m.resources_ok}/{m.resources_total} resources · {fmtBytes(m.total_bytes)}
                  </span>
                  {m.dedup_ratio != null && m.dedup_ratio > 0 && (
                    <span className="text-xs text-foreground">dedup {m.dedup_ratio}×</span>
                  )}
                  <span className="ml-auto text-xs text-foreground">
                    {m.started_at ? new Date(m.started_at).toLocaleString() : ""}
                  </span>
                </div>
                {/* Per-resource breakdown */}
                {Array.isArray(m.resource_details) && m.resource_details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.resource_details.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-3 text-center ${
                          r.status === "ok" ? "text-action-success" : "text-action-danger"
                        }`}>
                          {r.status === "ok" ? "✓" : "✗"}
                        </span>
                        <span className="w-28 truncate text-foreground">{r.name}</span>
                        <span className="w-16 text-foreground">{r.category}</span>
                        {r.error && <span className="truncate text-action-danger">{r.error.slice(0, 60)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Restic Snapshots */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Restic Snapshots ({snapshots.length})
        </h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-foreground">No restic snapshots recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Snapshot</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Tag</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Device</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Files</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Added</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Checksum</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">When</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{s.snapshot_id}</td>
                    <td className="px-3 py-2 text-foreground">{s.tag ?? "—"}</td>
                    <td className="px-3 py-2 text-foreground">
                      {s.device_name ?? s.mount_point ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground">{s.stats_json?.files_new ?? 0}</td>
                    <td className="px-3 py-2 text-foreground">{fmtBytes(s.stats_json?.bytes_added ?? 0)}</td>
                    <td className={`px-3 py-2 text-xs ${s.checksum_verified ? "text-action-success" : "text-foreground"}`}>
                      {s.checksum_verified ? "✓ verified" : "pending"}
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {s.time ? new Date(s.time).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Maintenance Policies */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Maintenance Policies ({maintPols.length})
        </h2>
        {maintPols.length === 0 ? (
          <p className="text-sm text-foreground">
            No maintenance policies configured. The worker will auto-prune dangling Docker images and
            rotate logs on its 30-minute cycle.
          </p>
        ) : (
          <div className="space-y-1">
            {maintPols.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${p.enabled ? "bg-action-success" : "bg-border"}`} />
                <span className="flex-1 text-foreground">{p.name}</span>
                <span className="text-xs text-foreground">{p.category}</span>
                <span className="text-xs text-foreground">
                  {p.last_run_at ? `last: ${new Date(p.last_run_at).toLocaleString()}` : "never run"}
                </span>
                {p.last_result && (
                  <span className="max-w-48 truncate text-xs text-foreground" title={p.last_result}>
                    {p.last_result}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
