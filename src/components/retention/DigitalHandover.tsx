"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Handshake,
  AlertTriangle,
  Wrench,
  ListTodo,
  CheckCircle,
  Plus,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import {
  getShiftHandovers,
  createShiftHandover,
  type HandoverItem,
  type HandoverRecord,
} from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HANDOVER_ROLES = [
  "operator",
  "caretaker",
  "supervisor",
  "admin",
  "sysadmin",
  "hostel_manager",
];

const ITEM_TYPES = [
  "unresolved_incident",
  "equipment_fault",
  "outstanding_exception",
  "pending_task",
] as const;

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  low: "text-slate-400 border-slate-600/30 bg-slate-700/20",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function DigitalHandover() {
  const { user, role } = useAuthStore();
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [toRole, setToRole] = useState("operator");
  const [items, setItems] = useState<HandoverItem[]>([
    { type: "unresolved_incident", title: "", severity: "medium" },
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canHandover = HANDOVER_ROLES.includes(role ?? "");

  const load = useCallback(async () => {
    if (!user || !canHandover) return;
    setLoading(true);
    try {
      const result = await getShiftHandovers(role ?? undefined);
      if (result.success) {
        setHandovers(result.data.handovers);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user, role, canHandover]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { type: "unresolved_incident", title: "", severity: "medium" },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof HandoverItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value } as HandoverItem;
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    const validItems = items.filter((i) => i.title.trim());
    if (validItems.length === 0) return;
    setSubmitting(true);
    try {
      const result = await createShiftHandover({
        toRole,
        items: validItems,
        notes: notes.trim() || undefined,
      });
      if (result.success) {
        setItems([{ type: "unresolved_incident", title: "", severity: "medium" }]);
        setNotes("");
        setShowForm(false);
        load();
      }
    } catch {
      // Silently ignore
    } finally {
      setSubmitting(false);
    }
  }, [user, toRole, items, notes, load]);

  return (
    <WidgetBoundary title="Digital Handover">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-100">Shift Handover</h3>
            <span className="text-xs text-slate-500 capitalize">{role}</span>
          </div>
          {canHandover && (
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors motion-reduce:transition-none"
            >
              <Plus className="h-3.5 w-3.5" />
              {showForm ? "Cancel" : "New Handover"}
            </button>
          )}
        </div>

        {/* Create Handover Form */}
        {showForm && (
          <div className="mb-4 space-y-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Hand over to role
                </label>
                <select
                  value={toRole}
                  onChange={(e) => setToRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                >
                  {HANDOVER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Brief shift summary"
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-[11px] text-slate-400 mb-2">Items to hand over</p>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <select
                      value={item.type}
                      onChange={(e) =>
                        updateItem(idx, "type", e.target.value)
                      }
                      className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none w-32 shrink-0"
                      aria-label="Item type"
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ").toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        updateItem(idx, "title", e.target.value)
                      }
                      placeholder="Describe the item"
                      className="flex-1 rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                    <select
                      value={item.severity}
                      onChange={(e) =>
                        updateItem(idx, "severity", e.target.value)
                      }
                      className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none w-20 shrink-0"
                      aria-label="Severity"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Med</option>
                      <option value="high">High</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors motion-reduce:transition-none shrink-0"
                      aria-label="Remove item"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 transition-colors motion-reduce:transition-none"
              >
                + Add another item
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || items.filter((i) => i.title.trim()).length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/80 px-4 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-40 transition-colors motion-reduce:transition-none"
            >
              {submitting ? (
                "Creating…"
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Generate Handover
                </>
              )}
            </button>
          </div>
        )}

        {/* Handover History */}
        {loading ? (
          <div className="h-20 animate-pulse rounded bg-slate-700/20" />
        ) : handovers.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No handovers yet. Generate one at the end of your shift.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {handovers.map((ho) => {
              const expanded = expandedId === ho.id;
              return (
                <div
                  key={ho.id}
                  className={`rounded-lg border p-3 ${
                    expanded
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-slate-700/40 bg-slate-800/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : ho.id)}
                    className="flex w-full items-start gap-2 text-left"
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                        ho.items.some((i) => i.severity === "high")
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {ho.items.some((i) => i.severity === "high") ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Wrench className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">
                        {ho.byUserName} → {ho.toRole}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(ho.createdAt).toLocaleString()}
                        <span>·</span>
                        {ho.items.length} item(s)
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 shrink-0 transition-transform motion-reduce:transition-none ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-1.5">
                      {ho.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          "{ho.notes}"
                        </p>
                      )}
                      {ho.items.map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 rounded border p-2 ${SEVERITY_COLORS[item.severity ?? "low"] ?? SEVERITY_COLORS.low}`}
                        >
                          <ListTodo className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-200 truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] opacity-70 capitalize">
                              {item.type.replace(/_/g, " ")}
                            </p>
                          </div>
                          <span className="text-[10px] uppercase shrink-0 opacity-70">
                            {item.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default DigitalHandover;
