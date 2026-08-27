"use client";

import { useState, useEffect } from "react";
import { Database, Download, Upload, Loader2, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function BackupManagement() {
  const { token, user } = useAuthStore();
  const sessionToken = user?.currentSessionToken;
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = sessionToken ? { "X-Session-Token": sessionToken } : {};
      const res = await fetch("/api/admin/backup", { headers });
      const json = await res.json();
      if (res.ok && json.success) setBackups(json.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleCreateBackup = async () => {
    setBusy(true); setMsg(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["X-Session-Token"] = sessionToken;
      const res = await fetch("/api/admin/backup", { method: "POST", headers, body: JSON.stringify({ action: "create" }) });
      const json = await res.json();
      if (res.ok && json.success) {
        setMsg({ type: "success", text: `Backup created (${json.data?.recordCount} records)` });
        if (json.dump) {
          const blob = new Blob([JSON.stringify(json.dump, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = json.data?.filename || "backup.json"; a.click();
        }
        fetchBackups();
      } else { setMsg({ type: "error", text: json.error?.message || "Failed" }); }
    } catch (err: any) { setMsg({ type: "error", text: err.message }); } finally { setBusy(false); }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("Restore database from snapshot? Matching records will be updated.")) return;
    setBusy(true); setMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (sessionToken) headers["X-Session-Token"] = sessionToken;
          const res = await fetch("/api/admin/backup", { method: "POST", headers, body: JSON.stringify({ action: "restore", backupData }) });
          const json = await res.json();
          if (res.ok && json.success) {
            setMsg({ type: "success", text: `Restored! Tables: ${json.data?.restoredTables?.join(", ")}` });
            fetchBackups();
          } else { setMsg({ type: "error", text: json.error?.message || "Restore failed" }); }
        } catch { setMsg({ type: "error", text: "Invalid JSON backup" }); } finally { setBusy(false); }
      };
      reader.readAsText(file);
    } catch { setMsg({ type: "error", text: "Read error" }); setBusy(false); }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" /> Database Backup & Restore
          </h3>
          <p className="text-xs text-[var(--text-muted)]">Create snapshots or restore database state.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-base)] flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-amber-400" /> Restore Snapshot
            <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" disabled={busy} />
          </label>
          <button onClick={handleCreateBackup} disabled={busy} className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Backup Now
          </button>
        </div>
      </div>

      {msg && <div className={`p-3 rounded-lg text-xs font-medium ${msg.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{msg.text}</div>}

      {loading ? (
        <div className="text-xs text-center py-4 text-[var(--text-muted)] flex justify-center items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-400" /> Loading backups...
        </div>
      ) : backups.length === 0 ? (
        <div className="text-xs text-center py-4 text-[var(--text-muted)]">No backup snapshots recorded.</div>
      ) : (
        <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          {backups.slice(0, 5).map((b) => (
            <div key={b.id} className="p-2.5 flex items-center justify-between bg-[var(--bg-elevated)]/40 text-xs">
              <div>
                <p className="font-semibold text-sky-400 font-mono">{b.filename}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{new Date(b.createdAt).toLocaleString("en-IN")} &bull; {b.recordCount} records</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-emerald-500/10 text-emerald-400 font-bold">{b.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
