"use client";
import { useEffect, useState } from "react";
import { Bell, ShieldCheck, Database, Loader2, XCircle } from "lucide-react";
import { BackupManagement } from "./BackupManagement";
import { getAuthHeaders } from "@/lib/utils";

interface SystemConfig {
  notificationsEnabled?: boolean;
}

export function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/config", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setConfig(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (key: string, value: any) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/system/config", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Settings updated.");
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to update settings"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h3 className="font-semibold">System Settings</h3>
          {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
          </div>
        ) : error ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <XCircle className="w-10 h-10 text-red-500" />
            <h4 className="font-semibold text-lg">Could not load settings</h4>
            <p className="text-sm text-[var(--text-muted)]">{typeof error === "string" ? error : (error as any)?.message || String(error)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notification Settings
                </p>
                <p className="text-sm text-[var(--text-muted)]">Configure alert triggers and channels.</p>
              </div>
              <button
                onClick={() => save("notificationsEnabled", !config?.notificationsEnabled)}
                disabled={busy}
                className={`text-sm font-medium px-3 py-1 rounded-full ${config?.notificationsEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
              >
                {config?.notificationsEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Security Policies
                </p>
                <p className="text-sm text-[var(--text-muted)]">Define password strength and session timeouts.</p>
              </div>
              <button className="text-sm font-medium text-sky-400 hover:underline">Manage</button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" /> Data Backup
                </p>
                <p className="text-sm text-[var(--text-muted)]">Manage automated data backup and restore points.</p>
              </div>
              <button
                onClick={() => setShowBackupModal(!showBackupModal)}
                className="text-sm font-medium text-sky-400 hover:underline font-semibold"
              >
                {showBackupModal ? "Hide Backup Panel" : "Manage Backups"}
              </button>
            </div>
          </div>
        )}
      </div>

      {showBackupModal && <BackupManagement />}
    </div>
  );
}

