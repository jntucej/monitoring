"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { DoorOpen, Plus, Trash2, Edit3, ShieldAlert, CheckCircle2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface ExitReason {
  code: string;
  name: string;
  description: string;
  applicableTo: string[];
  requiresApproval: boolean;
  approvalBy: string;
  parentNotification: string;
  maxDurationHours: number | null;
}

export default function ExitReasonsPage() {
  const [reasons, setReasons] = useState<ExitReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReason, setEditingReason] = useState<Partial<ExitReason> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/exit-reasons", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) setReasons(json.data || []);
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load exit reasons" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReason?.code || !editingReason?.name) return;

    try {
      const res = await fetch("/api/config/exit-reasons", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(editingReason),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Saved exit reason ${editingReason.code}` });
        setEditingReason(null);
        fetchReasons();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to save exit reason" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error saving exit reason" });
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete exit reason '${code}'?`)) return;
    try {
      const res = await fetch(`/api/config/exit-reasons?code=${code}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Deleted exit reason ${code}` });
        fetchReasons();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to delete" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error deleting reason" });
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <DoorOpen className="w-6 h-6 text-amber-400" />
              Exit Reasons & Outpass Governance
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage departure reasons, approval levels, and automatic notification workflows
            </p>
          </div>
          <button
            onClick={() =>
              setEditingReason({
                code: "",
                name: "",
                description: "",
                applicableTo: ["student"],
                requiresApproval: true,
                approvalBy: "warden",
                parentNotification: "immediate",
                maxDurationHours: 12,
              })
            }
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Exit Reason
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {statusMsg.text}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm animate-pulse">
              Loading exit reason policies…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-xs">
                  <tr>
                    <th className="p-4">Code</th>
                    <th className="p-4">Reason Name</th>
                    <th className="p-4">Approval Level</th>
                    <th className="p-4">Parent Notification</th>
                    <th className="p-4">Max Duration</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {reasons.map((r) => (
                    <tr key={r.code} className="hover:bg-[var(--bg-elevated)]/50 transition">
                      <td className="p-4 font-mono font-bold text-amber-400">{r.code}</td>
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-primary)]">{r.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.description || "No description"}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                            r.requiresApproval
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {r.requiresApproval ? r.approvalBy : "Auto Approved"}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-semibold capitalize text-[var(--text-muted)]">
                        {r.parentNotification}
                      </td>
                      <td className="p-4 text-xs text-[var(--text-muted)] font-mono">
                        {r.maxDurationHours ? `${r.maxDurationHours} hrs` : "Unlimited"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingReason(r)}
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-amber-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reasons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                        No exit reasons defined. Click "Add Exit Reason" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {editingReason && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingReason.code ? "Edit Exit Reason" : "Create New Exit Reason"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Reason Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editingReason.code || ""}
                    onChange={(e) => setEditingReason({ ...editingReason, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MEDICAL"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingReason.name || ""}
                    onChange={(e) => setEditingReason({ ...editingReason, name: e.target.value })}
                    placeholder="e.g. Medical Emergency"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingReason.description || ""}
                    onChange={(e) => setEditingReason({ ...editingReason, description: e.target.value })}
                    placeholder="Brief policy note..."
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Approval By
                    </label>
                    <select
                      value={editingReason.approvalBy || "warden"}
                      onChange={(e) => setEditingReason({ ...editingReason, approvalBy: e.target.value, requiresApproval: e.target.value !== "none" })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                    >
                      <option value="none">None (Auto Approve)</option>
                      <option value="warden">Warden</option>
                      <option value="hod">HOD</option>
                      <option value="principal">Principal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Max Duration (Hours)
                    </label>
                    <input
                      type="number"
                      value={editingReason.maxDurationHours || ""}
                      onChange={(e) => setEditingReason({ ...editingReason, maxDurationHours: Number(e.target.value) || null })}
                      placeholder="e.g. 12"
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingReason(null)}
                    className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-xl text-xs font-semibold hover:bg-[var(--border)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-semibold hover:bg-amber-600 transition"
                  >
                    Save Policy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}