"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Users, LogOut, RefreshCw } from "lucide-react";

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
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "X-User-Id": user?.id || "",
        "X-User-Role": user?.role || "",
      };
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      const res = await fetch("/api/admin/sessions", { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.data || []);
      }
    } catch {
      // Best effort
    } finally {
      setLoading(false);
    }
  }, [user, currentSessionToken]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => fetchSessions(), 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleRevokeSession = async (targetUserId: string, userName: string) => {
    if (!confirm(`Are you sure you want to force logout ${userName}?`)) return;

    setRevokingId(targetUserId);
    try {
      const headers: Record<string, string> = {
        "X-User-Id": user?.id || "",
        "X-User-Role": user?.role || "",
      };
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

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
    } catch (err: any) {
      addToast({ title: "Revocation Failed", message: err.message, variant: "error" });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" /> Active User Sessions
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time view of currently authenticated users across web & mobile hardware
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh List
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">Fetching active session tokens...</div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">No active sessions detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-elevated)]/40">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Session Token</th>
                  <th className="p-4">Last Activity</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sessions.map((sess) => (
                  <tr key={sess.userId} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {sess.name}
                      <span className="block text-[10px] text-[var(--text-muted)] font-normal">{sess.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                        {sess.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-purple-300">{sess.sessionTokenTruncated}</td>
                    <td className="p-4 font-mono text-[10px] text-[var(--text-muted)]">
                      {new Date(sess.lastActive).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(sess.userId, sess.name)}
                        disabled={revokingId === sess.userId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-[10px] transition-all disabled:opacity-50"
                      >
                        <LogOut className="w-3 h-3" /> Force Logout
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
