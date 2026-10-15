"use client";

import { useEffect, useState } from "react";
import {
  ScrollText,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ExitReason {
  code: string;
  name: string;
  description: string;
  applicableTo: string[];
  requiresApproval: boolean;
  approvalBy: string;
  parentNotification: string;
  maxDurationHours: number | null;
  is_active: boolean;
}

interface Props {
  initialReasons: ExitReason[];
  onChanged: () => void;
}

const APPROVAL_TARGETS = ["none", "principal", "admin", "sysadmin"];
const NOTIFICATION_OPTIONS = ["silent", "sms", "email", "both"];
const APPLICABLE_OPTIONS = ["student", "faculty", "staff", "worker", "visitor"];

export function ExitReasonsManager({ initialReasons, onChanged }: Props) {
  const [reasons, setReasons] = useState<ExitReason[]>(initialReasons);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // form state for create / edit
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<ExitReason | null>(null);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ExitReason | null>(null);

  useEffect(() => {
    setReasons(initialReasons);
  }, [initialReasons]);

  const openCreate = () => {
    setEditingIndex(null);
    setForm({
      code: "",
      name: "",
      description: "",
      applicableTo: ["student"],
      requiresApproval: false,
      approvalBy: "none",
      parentNotification: "silent",
      maxDurationHours: null,
      is_active: true,
    });
    setFormOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setForm({ ...reasons[index] });
    setFormOpen(true);
  };

  const updateField = (key: keyof ExitReason, value: any) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const toggleApplicable = (opt: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev.applicableTo || [];
      return {
        ...prev,
        applicableTo: current.includes(opt)
          ? current.filter((x) => x !== opt)
          : [...current, opt],
      };
    });
  };

  const saveForm = async () => {
    if (!form) return;
    if (!form.code.trim() || !form.name.trim()) {
      setMessage({ type: "error", text: "Code and Name are required." });
      return;
    }
    setLoading(true);
    setMessage(null);

    const payload = {
      code: form.code,
      name: form.name,
      description: form.description,
      applicableTo: form.applicableTo,
      requiresApproval: form.requiresApproval,
      approvalBy: form.approvalBy,
      parentNotification: form.parentNotification,
      maxDurationHours: form.maxDurationHours,
    };

    try {
      const method = editingIndex === null ? "POST" : "PATCH";
      const res = await fetch("/api/config/exit-reasons", {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: editingIndex === null ? "Exit reason created." : "Exit reason updated." });
        setFormOpen(false);
        setForm(null);
        onChanged();
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save exit reason." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving." });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/config/exit-reasons?code=${encodeURIComponent(deleteTarget.code)}`,
        { method: "DELETE", headers: getAuthHeaders() }
      );
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Deleted ${deleteTarget.name}.` });
        onChanged();
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to delete." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while deleting." });
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]";

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-[var(--text-primary)]">
          <ScrollText className="w-5 h-5 text-[var(--action-warning)]" />
          Exit Reasons
        </h3>
        <button
          type="button"
          onClick={openCreate}
          className="text-xs flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]"
        >
          <Plus className="w-3 h-3" /> Add Reason
        </button>
      </div>

      {reasons.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No exit reasons configured.</p>
      ) : (
        <div className="space-y-2">
          {reasons.map((r, i) => (
            <div
              key={r.code}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                r.is_active
                  ? "border-[var(--border)] bg-[var(--bg-base)]"
                  : "border-[var(--border)] bg-[var(--bg-base)] opacity-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {r.description || "No description"}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  approval: {r.approvalBy} · notify: {r.parentNotification}
                  {r.maxDurationHours != null && ` · max ${r.maxDurationHours}h`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(i)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--action-primary)]"
                  aria-label="Edit exit reason"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(r)}
                  className="p-1.5 text-rose-500 hover:text-rose-400"
                  aria-label="Delete exit reason"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div
          className={`flex items-center gap-2 text-sm font-medium mt-3 ${
            message.type === "success" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingIndex === null ? "New Exit Reason" : "Edit Exit Reason"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => updateField("code", e.target.value)}
                    className={inputCls}
                    disabled={editingIndex !== null}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className={`${inputCls} min-h-[60px]`}
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2">Applicable To</label>
                <div className="flex flex-wrap gap-3">
                  {APPLICABLE_OPTIONS.map((opt) => (
                    <label key={opt} className="text-xs flex items-center gap-1 text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={(form.applicableTo || []).includes(opt)}
                        onChange={() => toggleApplicable(opt)}
                        className="accent-[var(--action-primary)]"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Requires Approval</label>
                  <select
                    value={form.requiresApproval ? "true" : "false"}
                    onChange={(e) => updateField("requiresApproval", e.target.value === "true")}
                    className={inputCls}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Approval By</label>
                  <select
                    value={form.approvalBy}
                    onChange={(e) => updateField("approvalBy", e.target.value)}
                    className={inputCls}
                  >
                    {APPROVAL_TARGETS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Parent Notification</label>
                  <select
                    value={form.parentNotification}
                    onChange={(e) => updateField("parentNotification", e.target.value)}
                    className={inputCls}
                  >
                    {NOTIFICATION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Max Duration (hours)</label>
                  <input
                    type="number"
                    value={form.maxDurationHours ?? ""}
                    onChange={(e) =>
                      updateField("maxDurationHours", e.target.value === "" ? null : Number(e.target.value))
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-[var(--action-primary)] text-white hover:brightness-110 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Exit Reason"
        body={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => void confirmDelete()}
        confirmText="Delete"
      />
    </div>
  );
}
