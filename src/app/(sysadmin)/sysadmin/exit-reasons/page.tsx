"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const [reasonToDelete, setReasonToDelete] = useState<string | null>(null);

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

  const handleDelete = (code: string) => setReasonToDelete(code);

  const confirmDeleteReason = async () => {
    if (!reasonToDelete) return;
    try {
      const res = await fetch(`/api/config/exit-reasons?code=${reasonToDelete}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Deleted exit reason ${reasonToDelete}` });
        fetchReasons();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to delete" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error deleting reason" });
    } finally {
      setReasonToDelete(null);
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <DoorOpen className="w-6 h-6 text-amber-400" />
              Exit Reasons & Outpass Governance
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Manage departure reasons, approval levels, and automatic notification workflows
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingReason({
                code: "",
                name: "",
                description: "",
                applicableTo: ["student"],
                requiresApproval: true,
                approvalBy: "principal",
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
              Loading exit reasons telemetry…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-xs">
                  <tr>
                    <th className="p-4">Reason Code</th>
                    <th className="p-4">Display Name</th>
                    <th className="p-4">Audience</th>
                    <th className="p-4">Approval Chain</th>
                    <th className="p-4">Max Duration</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {reasons.map((r) => (
                    <tr key={r.code} className="hover:bg-[var(--bg-elevated)]/50 transition">
                      <td className="p-4 font-mono font-bold text-amber-400">{r.code}</td>
                      <td className="p-4 font-semibold text-[var(--text-primary)]">
                        {r.name}
                        <p className="text-xs font-normal text-[var(--text-muted)]">{r.description}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(r.applicableTo || []).map((a) => (
                            <span key={a} className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-mono">
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        {r.requiresApproval ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                            {r.approvalBy}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Auto-approve
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--text-primary)]">
                        {r.maxDurationHours ? `${r.maxDurationHours} Hours` : "Unlimited"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingReason(r)}
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-amber-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editingReason && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingReason.code ? "Edit Exit Reason" : "New Exit Reason"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingReason.description || ""}
                    onChange={(e) => setEditingReason({ ...editingReason, description: e.target.value })}
                    placeholder="Provide context for students..."
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Approval Level
                    </label>
                    <select
                      value={editingReason.approvalBy || "principal"}
                      onChange={(e) => setEditingReason({ ...editingReason, approvalBy: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                    >
                      <option value="principal">Principal</option>
                      <option value="warden">Warden</option>
                      <option value="hod">HOD</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Max Duration (Hours)
                    </label>
                    <input
                      type="number"
                      value={editingReason.maxDurationHours || ""}
                      onChange={(e) => setEditingReason({ ...editingReason, maxDurationHours: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 24"
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
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
                    disabled={!editingReason.code || !editingReason.name}
                    className="px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Save Exit Reason
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!reasonToDelete}
          onClose={() => setReasonToDelete(null)}
          title="Delete exit reason?"
          body={`Delete exit reason "${reasonToDelete ?? ""}"? This is audited.`}
          confirmText="Delete"
          variant="destructive"
          onConfirm={confirmDeleteReason}
        />
      </div>
    </AuthGuard>
  );
}
