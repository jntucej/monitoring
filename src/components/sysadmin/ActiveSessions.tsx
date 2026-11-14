"use client";
import { errMsg } from "@/lib/err-msg";

import { useState, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Users, LogOut, RefreshCw } from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface ActiveSession {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  sessionTokenTruncated: string;
  lastActive: string;
}

export function ActiveSessions() {
  const api = useApi();

  const { addToast } = useUIStore();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // silent=true → background poll: never blank the table, just show a subtle
  // "refreshing" indicator. Only the very first load shows the fetcher.
  const fetchSessions = useCallback(async (silent: boolean = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = api.getHeaders();
      const res = await fetch("/api/admin/sessions", { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.data || []);
      }
    } catch {
      // Best effort — keep the last known list so a transient 5xx never
      // makes the table vanish (which is what looked "glitchy").
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.getHeaders]);

  // Initial load only — no background poll. Sessions change when users log
  // in/out, not continuously; the 30-second timer was just adding request
  // load to /api/admin/sessions. Manual refresh remains via the panel's
  // Refresh button.
  useEffect(() => {
    fetchSessions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeSession = async (targetUserId: string, userName: string) => {
    if (!confirm(`Are you sure you want to force logout ${userName}?`)) return;

    setRevokingId(targetUserId);
    try {
      const headers = api.getHeaders();
      const res = await fetch(`/api/admin/sessions/${targetUserId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to revoke session");
      }

      addToast({
        title: "Session Revoked",
        message: `User ${userName} has been logged out`,
        variant: "success",
      });
      fetchSessions();
    } catch (err) {
      addToast({ title: "Revocation Failed", message: errMsg(err), variant: "error" });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-surface p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-action-info" /> Active User Sessions
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Real-time view of currently authenticated users across web & mobile hardware
          </p>
        </div>
        <button
          onClick={() => fetchSessions(false)}
          disabled={loading || refreshing}
          className="surface-card inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-action-info text-white text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading || refreshing ? "animate-spin" : ""}`} />
          {refreshing && !loading ? "Refreshing…" : "Refresh List"}
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-text-muted">Fetching active session tokens...</div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">No active sessions detected.</div>
        ) : (
          <div className="overflow-x-auto">
            {refreshing && (
              <div className="px-4 py-1.5 text-xs text-text-muted bg-bg-elevated/40 flex items-center gap-1.5">
                <RefreshCw className="size-3.5 animate-spin" /> Refreshing in background…
              </div>
            )}
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-border text-text-muted bg-bg-elevated/40">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Session Token</th>
                  <th className="p-4">Last Activity</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((sess) => (
                  <tr key={sess.userId} className="hover:bg-bg-elevated/30 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {sess.name}
                      <span className="block text-xs text-text-muted font-normal">{sess.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="surface-card px-2 py-0.5 text-xs font-mono font-bold bg-sky-500/20 text-action-info uppercase">
                        {sess.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-purple-300">{sess.sessionTokenTruncated}</td>
                    <td className="p-4 font-mono text-xs text-text-muted">
                      {new Date(sess.lastActive).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(sess.userId, sess.name)}
                        disabled={revokingId === sess.userId}
                        className="surface-card inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 text-action-danger hover:bg-action-danger hover:text-white font-bold text-xs transition-all disabled:opacity-50"
                      >
                        <LogOut className="size-3.5" /> Force Logout
                      </button>
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
