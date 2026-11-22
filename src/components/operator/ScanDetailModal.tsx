"use client";

import { useEffect, useState } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  History,
  Loader2,
  Pencil,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { Scan, Person } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { EditableField } from "@/components/shared/EditableField";
import { DurationBar } from "@/components/shared/DurationBar";
import { getAuthHeaders } from "@/lib/utils";

interface ScanDetailModalProps {
  scan: Scan | null;
  onClose: () => void;
  /** Called after a scan category edit succeeds. Triggers refresh. */
  onEditComplete?: () => void;
}

interface ScanCategoryEdit {
  scanId: string;
  category: string;
  reason: string;
  editedBy: string;
  editedAt: string;
}

/** Fetch scan category edits from the audit trail. */
async function fetchScanEdits(scanId: string): Promise<ScanCategoryEdit[]> {
  try {
    const res = await fetch(`/api/operator/scans/${encodeURIComponent(scanId)}/edits`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.data) return [];
    return body.data as ScanCategoryEdit[];
  } catch {
    return [];
  }
}

interface PersonPayload {
  person: Person;
  campusStatus?: string;
  lastScan?: Scan | null;
  history?: Scan[];
}

export function ScanDetailModal({ scan, onClose, onEditComplete }: ScanDetailModalProps) {
  const [payload, setPayload] = useState<PersonPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<ScanCategoryEdit[]>([]);
  const [editsLoading, setEditsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);

  // Load the person overview + prior category edits
  useEffect(() => {
    if (!scan) {
      setPayload(null);
      setError(null);
      setEdits([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = useAuthStore.getState();
        const headers: Record<string, string> = {};
        if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
        if (auth.user?.currentSessionToken) headers["X-Session-Token"] = auth.user.currentSessionToken;
        const idParam = encodeURIComponent(scan.uniqueId || scan.roll || "");
        const res = await fetch(`/api/persons/${idParam}`, { headers });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json?.success) setPayload(json.data as PersonPayload);
        else setError(json?.error?.message || "Could not load person overview");
      } catch {
        if (!cancelled) setError("Network error while loading overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [scan]);

  // Load edit trail when a scan with an id is open
  useEffect(() => {
    if (!scan?.id) return;
    let cancelled = false;
    setEditsLoading(true);
    fetchScanEdits(scan.id).then((list) => {
      if (!cancelled) {
        setEdits(list);
        setEditsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scan?.id]);

  const handleCategoryEdit = async (newCategory: string, reason: string) => {
    if (!scan?.id) return;
    await fetch(`/api/operator/scans/${scan.id}/category`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory, reason }),
    });
    setEditingCategory(false);
    // Refresh the edit trail
    setEditsLoading(true);
    fetchScanEdits(scan.id).then((list) => {
      setEdits(list);
      setEditsLoading(false);
    });
    onEditComplete?.();
  };

  // Time-range of validity: entry→exit if both present, else just the scan moment
  const scanStart = scan?.timestamp ?? new Date().toISOString();
  const scanEnd = payload?.lastScan?.timestamp ?? scanStart;
  const durationMs = Math.max(0, new Date(scanEnd).getTime() - new Date(scanStart).getTime());

  if (!scan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div
        className="surface-card bg-bg-surface sm: w-full max-w-md max-h-[85dvh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">{payload?.person?.fullName || scan.name}</h3>
            <p className="text-xs font-mono text-text-muted">
              {payload?.person?.uniqueId || scan.roll}
              {payload?.person?.personType ? ` · ${payload.person.personType}` : ""}
              {payload?.campusStatus ? (
                <span className={`ml-2 font-bold ${payload.campusStatus === "IN" ? "text-action-success" : "text-action-danger"}`}>
                  ON CAMPUS: {payload.campusStatus}
                </span>
              ) : null}
            </p>
          </div>
          <button onClick={onClose} className="surface-card p-1.5 hover:bg-bg-base">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading overview…
          </div>
        ) : error ? (
          <div className="surface-card text-xs text-action-warning bg-amber-400/10 p-3">{error}</div>
        ) : null}

        {/* This scan */}
        <div className={`rounded-xl p-4 space-y-2 border ${scan.direction === "IN" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <p className="text-xs uppercase font-bold tracking-wider text-text-muted">This Record</p>
          <div className="flex items-center gap-3">
            {scan.direction === "IN" ? (
              <ArrowDownLeft className="w-6 h-6 text-action-success" />
            ) : (
              <ArrowUpRight className="w-6 h-6 text-action-danger" />
            )}
            <div>
              <p className={`font-bold text-sm ${scan.direction === "IN" ? "text-action-success" : "text-action-danger"}`}>
                {scan.direction === "IN" ? "ENTRY" : "EXIT"}
                {scan.reason ? <span className="ml-2 text-xs font-semibold text-text-secondary">({scan.reason})</span> : null}
              </p>
              <p className="text-xs text-text-muted">
                {new Date(scan.timestamp).toLocaleString()} · {scan.gateName || "Gate"}
              </p>
            </div>
          </div>

          {/* Scan category — editable with audit reason */}
          <div className="pt-1">
            {editingCategory ? (
              <EditableField
                value={scan.reason ?? "No category"}
                onSave={handleCategoryEdit}
                fieldLabel="scan category"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Category</span>
                <span className="text-xs font-bold text-text-primary">{scan.reason ?? "—"}</span>
                <button
                  type="button"
                  onClick={() => setEditingCategory(true)}
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary"
                  title="Edit scan category (with reason)"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-text-secondary inline-flex items-center gap-1.5 pt-1 flex-wrap">
            <ShieldCheck className="w-3.5 h-3.5 textfocus-ring" />
            Processed by operator: <span className="font-bold text-text-primary">{scan.operatorName || "—"}</span>
            {scan.isManual ? <span className="surface-card px-1.5 py-0.5 bg-amber-400/15 text-action-warning text-xs font-bold">MANUAL</span> : null}
            {scan.isCorrection ? <span className="surface-card px-1.5 py-0.5 bg-sky-400/15 text-action-info text-xs font-bold">CORRECTION</span> : null}
          </p>
        </div>

        {/* Time-range of validity */}
        {durationMs > 0 && (
          <div className="rounded-xl border border-border bg-bg-elevated p-3 space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-text-muted inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time range
            </p>
            <DurationBar elapsedMs={durationMs} totalMs={durationMs} tone="info" />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{new Date(scanStart).toLocaleString()}</span>
              <span>{new Date(scanEnd).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Dispute / edit trail */}
        {edits.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-text-muted inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Category edit trail
            </p>
            <div className="space-y-1.5">
              {edits.map((e, i) => (
                <div key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                  <span className="font-medium text-text-primary shrink-0">{e.category}</span>
                  <span className="flex-1 truncate">{e.reason}</span>
                  <span className="text-text-muted shrink-0 tabular-nums">{e.editedAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Person details from API */}
        {payload?.person ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Department", payload.person.department],
              ["Designation", payload.person.designation],
              ["Year", payload.person.year != null ? String(payload.person.year) : undefined],
              ["Section", payload.person.section],
              ["Hostel Block", payload.person.hostelBlock],
              ["Room", payload.person.roomNumber],
            ]
              .filter((pair) => !!pair[1])
              .map(([k, v]) => (
                <div key={k} className="surface-card bg-bg-base px-3 py-2">
                  <p className="text-xs uppercase font-bold text-text-muted">{k}</p>
                  <p className="font-semibold truncate">{v}</p>
                </div>
              ))}
          </div>
        ) : null}

        {/* Movement history */}
        {payload?.history && payload.history.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-text-muted inline-flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Recent Movements
            </p>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {payload.history.slice(0, 12).map((h) => (
                <div key={h.id} className="surface-card flex items-center justify-between text-xs px-2 py-1.5 bg-bg-base">
                  <span className={`inline-flex items-center gap-1 font-bold ${h.direction === "IN" ? "text-action-success" : "text-action-danger"}`}>
                    {h.direction === "IN" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                    {h.direction === "IN" ? "Entry" : "Exit"}
                  </span>
                  <span className="text-text-muted">{new Date(h.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

