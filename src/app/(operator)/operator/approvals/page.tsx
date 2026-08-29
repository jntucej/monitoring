"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, ShieldCheck, Clock, RefreshCw, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import type { GatePass } from "@/lib/types";
import { getPassTypeName } from "@/hooks/usePassTypes";

export default function WardenApprovalsPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, "approving" | "rejecting">>({});
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({});
  const { user: _user } = useAuthStore();

  const loadPasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/passes?status=PENDING", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (Array.isArray(json.data)) setPasses(json.data);
      else setError(typeof json.error === "string" ? json.error : json.error?.message || "Failed to load pass requests");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPasses(); }, [loadPasses]);

  const handleAction = useCallback(async (passId: string, action: "approve" | "reject", comment: string) => {
    if (action === "reject" && !comment.trim()) {
      setRejectComment(prev => ({ ...prev, [`${passId}_err`]: "1" }));
      return;
    }
    setActionState(prev => ({ ...prev, [passId]: action === "approve" ? "approving" : "rejecting" }));
    try {
      const res = await fetch(`/api/passes/${passId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const json = await res.json();
      if (json.success) setPasses(prev => prev.filter(p => p.id !== passId));
      else setError(json.error?.message || "Action failed");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setActionState(prev => { const n = { ...prev }; delete n[passId]; return n; });
    }
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Warden Authorizations</h1>
            <p className="text-xs text-[var(--text-muted)]">Review and approve or reject outgoing student passes</p>
          </div>
        </div>
        <button onClick={loadPasses}
          className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Pass Type</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Comment (reject)</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading passes…</td></tr>
              ) : passes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 opacity-30" />
                      <span>No pending pass requests</span>
                    </div>
                  </td>
                </tr>
              ) : passes.map(p => {
                const busy = actionState[p.id];
                const needsComment = rejectComment[`${p.id}_err`];
                return (
                  <tr key={p.id} className="hover:bg-white/5">
                    <td className="p-4">
                      <div className="font-medium text-[var(--text-primary)]">{p.studentName}</div>
                      <div className="text-xs text-[var(--text-muted)] font-mono">{p.roll}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400">
                        {getPassTypeName(p.reason)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      {new Date(p.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <input
                          value={rejectComment[p.id] ?? ""}
                          onChange={e => setRejectComment(prev => ({ ...prev, [p.id]: e.target.value, [`${p.id}_err`]: "" }))}
                          placeholder="Required for reject"
                          className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border ${needsComment ? "border-rose-500/60" : "border-[var(--border)]"} focus:outline-none min-w-[120px]`}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleAction(p.id, "approve", rejectComment[p.id] ?? "")} disabled={!!busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-40">
                          <CheckCircle className="w-4 h-4" />
                          {busy === "approving" ? "…" : "Approve"}
                        </button>
                        <button onClick={() => handleAction(p.id, "reject", rejectComment[p.id] ?? "")} disabled={!!busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors disabled:opacity-40">
                          <XCircle className="w-4 h-4" />
                          {busy === "rejecting" ? "…" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
