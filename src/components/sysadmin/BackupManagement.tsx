"use client";

import { useState, useEffect } from "react";
import { Database, Download, Upload, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

export function BackupManagement() {
  const [backups, setBackups] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [resB, resV] = await Promise.all([
        fetch("/api/admin/backup", { headers }),
        fetch("/api/admin/backup/verify", { headers }),
      ]);
      const jsonB = await resB.json();
      const jsonV = await resV.json();
      if (resB.ok && jsonB.success) setBackups(jsonB.data || []);
      if (resV.ok && jsonV.success) setVerifications(jsonV.data || []);
    } catch {} finally { setLoading(false); }
  };

  const handleVerifyBackup = async () => {
    setVerifying(true); setMsg(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/backup/verify", { method: "POST", headers });
      const json = await res.json();
      if (res.ok && json.success) {
        if (json.data?.status === "failed") {
          setMsg({ type: "error", text: `Verification FAILED: ${json.data?.details || "core table checks did not pass"}` });
        } else {
          setMsg({ type: "success", text: `Verification Passed! Tables verified: ${json.data?.tablesVerified ?? 0}. Records checked: ${json.data?.recordsVerified ?? 0}.` });
        }
        fetchBackups();
      } else { setMsg({ type: "error", text: json.error?.message || "Backup verification failed" }); }
    } catch (err: any) { setMsg({ type: "error", text: err.message }); } finally { setVerifying(false); }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleCreateBackup = async () => {
    setBusy(true); setMsg(null);
    try {
      const headers = getAuthHeaders();
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
          const headers = getAuthHeaders();
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
          <button onClick={handleVerifyBackup} disabled={verifying || busy} className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
            {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Verify Integrity
          </button>
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
        <div className="space-y-3">
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

          {verifications.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Recent Verification History</h4>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden text-xs">
                {verifications.slice(0, 3).map((v) => (
                  <div key={v.id} className="p-2 flex items-center justify-between bg-[var(--bg-surface)]">
                    <div>
                      <span className="font-semibold text-emerald-400 font-mono">Verified: {v.recordsVerified || v.records_verified || 0} records</span>
                      <p className="text-[10px] text-[var(--text-muted)]">{new Date(v.verifiedAt || v.created_at || Date.now()).toLocaleString("en-IN")}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-emerald-500/20 text-emerald-400 font-bold">{v.status || "PASSED"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
