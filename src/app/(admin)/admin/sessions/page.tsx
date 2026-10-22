"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound, LogOut, Loader2, MonitorSmartphone, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

interface SessionRow {
  sessionId: string;
  userId: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  lastActive: string;
  ipAddress: string | null;
  userAgent: string | null;
}

async function fetchSessions(): Promise<SessionRow[]> {
  const res = await fetch("/api/admin/sessions", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? []) as SessionRow[];
}

/**
 * Admin Sessions — live active-session monitor + force-revoke.
 * Backend: /api/admin/sessions (admin|sysadmin scope).
 */
function AdminSessionsInner() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchSessions()); }
    catch (e) { console.error("sessions", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (sessionId: string) => {
    setBusy(sessionId);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const msg =
          res.status === 403
            ? "Session revoke requires sysadmin access — this action was not performed."
            : `Revoke failed (HTTP ${res.status}).`;
        addToast({ variant: "error", title: "Revoke failed", message: msg });
        return;
      }
      addToast({ variant: "success", title: "Session revoked", message: `Revoked for ${user?.name ?? "user"}.` });
      load();
    } catch (e) {
      console.error("revoke", e);
      addToast({ variant: "error", title: "Revoke failed", message: "Network error." });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Active Sessions"
        subtitle="Live JWT / refresh-token sessions — revoke any that look off"
        onRefresh={load}
      />

      <WidgetBoundary title="Session list">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)]">
            <p className="text-sm font-semibold flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-[var(--action-primary)]" />
              {rows.length} active session{rows.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Last active</th>
                  <th className="p-3 text-left">IP</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-[var(--text-muted)]">No active sessions.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.sessionId} className="hover:bg-[var(--bg-elevated)]/40">
                    <td className="p-3">
                      <p className="text-[var(--text-primary)] font-medium">{r.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">{r.email}</p>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] capitalize">{r.role}</span>
                    </td>
                    <td className="p-3 text-xs text-[var(--text-muted)]">
                      {r.lastActive ? new Date(r.lastActive).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{r.ipAddress ?? "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => revoke(r.sessionId)}
                        disabled={busy === r.sessionId}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--action-danger)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 hover:bg-[var(--action-danger)]/10 disabled:opacity-50"
                      >
                        {busy === r.sessionId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function AdminSessionsPage() {
  return (
    
      <AdminSessionsInner />
    
    

  );
}
