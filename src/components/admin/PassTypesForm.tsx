"use client";

import { useEffect, useState } from "react";
import { FileBadge, Save, Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface PassType {
  code: string;
  name: string;
  requiresApproval: boolean;
  approvalFlow: string;
  isActive: boolean;
}

const EMPTY_TYPE: PassType = {
  code: "",
  name: "",
  requiresApproval: true,
  approvalFlow: "principal",
  isActive: true,
};

export function PassTypesForm() {
  const [data, setData] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPassTypes = async () => {
    try {
      const res = await fetch("/api/config/pass-types", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(
          json.data.map((item: any) => ({
            code: item.code ?? "",
            name: item.name ?? "",
            requiresApproval: item.requiresApproval ?? item.requires_approval ?? true,
            approvalFlow: item.approvalFlow ?? item.approval_flow ?? "principal",
            isActive: item.isActive ?? item.is_active ?? true,
          }))
        );
      }
    } catch {
      // keep empty on fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPassTypes();
  }, []);

  const updateType = (index: number, key: keyof PassType, value: string | boolean) => {
    setData((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const addType = () => {
    setData((prev) => [...prev, { ...EMPTY_TYPE }]);
  };

  const removeType = (index: number) => {
    setData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config/pass-types", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(
          data
            .filter((item) => item.code.trim() && item.name.trim())
            .map((item) => ({
              code: item.code,
              name: item.name,
              requiresApproval: item.requiresApproval,
              approvalFlow: item.approvalFlow,
            }))
        ),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Pass types saved." });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save pass types." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <FileBadge className="w-5 h-5 text-[var(--action-primary)]" />
          Pass Types
        </h3>
        <div className="flex justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full px-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)]";

  return (
    <form
      onSubmit={handleSave}
      className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileBadge className="w-5 h-5 text-[var(--action-primary)]" />
          Pass Types
        </h3>
        <button
          type="button"
          onClick={addType}
          className="text-xs flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]"
        >
          <Plus className="w-3 h-3" /> Add Type
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {data.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">No pass types configured.</p>
        )}

        {data.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border border-[var(--border)] p-3 rounded-lg bg-[var(--bg-base)]"
          >
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase text-[var(--text-muted)] mb-1">Code</label>
              <input
                type="text"
                value={item.code}
                onChange={(e) => updateType(i, "code", e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase text-[var(--text-muted)] mb-1">Name</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateType(i, "name", e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase text-[var(--text-muted)] mb-1">Approval Flow</label>
              <input
                type="text"
                value={item.approvalFlow}
                onChange={(e) => updateType(i, "approvalFlow", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-4 pt-4">
              <label className="text-xs flex items-center gap-1 text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={item.requiresApproval}
                  onChange={(e) => updateType(i, "requiresApproval", e.target.checked)}
                  className="accent-[var(--action-primary)]"
                />
                Requires Approval
              </label>
              <label className="text-xs flex items-center gap-1 text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={item.isActive}
                  onChange={(e) => updateType(i, "isActive", e.target.checked)}
                  className="accent-[var(--action-primary)]"
                />
                Active
              </label>
            </div>
            <div className="md:col-span-1 pt-4 text-right">
              <button
                type="button"
                onClick={() => removeType(i)}
                className="text-rose-500 hover:text-rose-400 p-1"
                aria-label="Remove pass type"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {message && (
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
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
      </div>

      <div className="flex justify-end mt-4 pt-4 border-t border-[var(--border)]">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-primary)] text-white font-medium hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Pass Types
        </button>
      </div>
    </form>
  );
}
