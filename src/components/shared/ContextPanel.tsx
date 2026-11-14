"use client";

/**
 * ContextPanel — right-hand detail panel for a selected board row.
 *
 * For the operator console it shows the selected scan's person detail, today's
 * movement history for that person, and the available actions (correction,
 * open full history). Replaces ScanDetailModal in the console layout.
 *
 * Reuses /api/persons/[uniqueId] for the person overview and /api/gate/scan/[id]
 * for the correction action — no new routes.
 */

import { useCallback, useEffect, useState } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  History,
  Loader2,
  Pencil,
  ExternalLink,
  MapPin,
  User,
  Clock,
} from "lucide-react";
import type { Person, Scan } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { BoardRow } from "@/components/shared/Board";

interface PersonPayload {
  person: Person;
  campusStatus?: string;
  lastScan?: Scan | null;
  history?: Scan[];
}

export interface ContextPanelProps {
  /** The selected board row. */
  row: BoardRow | null;
  onClose: () => void;
  /** Route to the full scan history page (the existing sub-page). */
  historyHref?: string;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export function ContextPanel({ row, onClose, historyHref = "/operator/transactions" }: ContextPanelProps) {
  const [payload, setPayload] = useState<PersonPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  // Build a minimal Scan from the board row so the panel can render even
  // before the person payload resolves.
  const fallbackScan: Scan | null = row
    ? ({
        id: row.id,
        roll: row.roll ?? "",
        uniqueId: row.roll ?? "",
        name: row.name ?? row.roll ?? "",
        personType: (row.person_type as Scan["personType"]) ?? "student",
        direction: (row.direction as Scan["direction"]) ?? "IN",
        reason: (row.reason as Scan["reason"]) ?? undefined,
        gateId: row.gate_id ?? "",
        gateName: row.gate_name ?? "",
        operatorId: "",
        operatorName: "",
        timestamp: row.timestamp ?? row.created_at ?? new Date().toISOString(),
      } as Scan)
    : null;

  const load = useCallback(async () => {
    if (!row) {
      setPayload(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const auth = useAuthStore.getState();
      const headers: Record<string, string> = {};
      if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
      if (auth.user?.currentSessionToken) headers["X-Session-Token"] = auth.user.currentSessionToken;
      const idParam = encodeURIComponent(row.roll || "");
      const res = await fetch(`/api/persons/${idParam}`, { headers });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) setPayload(json.data as PersonPayload);
      else setError(json?.error?.message || "Could not load person overview");
    } catch {
      setError("Network error while loading overview");
    } finally {
      setLoading(false);
    }
  }, [row]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleCorrect = async () => {
    if (!row) return;
    const newDirection = prompt("Correct direction (IN / OUT):", row.direction === "IN" ? "OUT" : "IN");
    if (!newDirection || !["IN", "OUT"].includes(newDirection)) return;
    const correctionReason = prompt("Correction reason:") || "Operator correction";
    try {
      const auth = useAuthStore.getState();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
      if (auth.user?.currentSessionToken) headers["X-Session-Token"] = auth.user.currentSessionToken;
      const res = await fetch(`/api/gate/scan/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ newDirection: newDirection.toUpperCase(), correctionReason }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        addToast({ variant: "success", title: "Scan corrected", message: `Direction set to ${newDirection.toUpperCase()}.` });
        load();
      } else {
        addToast({ variant: "error", title: "Correction failed", message: json?.error?.message || "Could not correct scan." });
      }
    } catch {
      addToast({ variant: "error", title: "Correction failed", message: "Network error." });
    }
  };

  if (!row || !fallbackScan) return null;

  const person = payload?.person;
  const isIn = fallbackScan.direction === "IN";

  return (
    <aside
      aria-label="Context panel"
      className="hidden md:flex flex-col w85 lg:w95 shrink-0 bg-bg-surface border-l border-border overflow-y-auto custom-scrollbar"
    >
      {/* Header */}
      <div className="surface-card flex items-start justify-between gap-3 px-4 py-3 sticky top-0 bg-bg-surface/95 backdrop-blur-md">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-primary truncate">
            {person?.fullName || fallbackScan.name}
          </h3>
          <p className="text-xs font-mono text-text-muted truncate">
            {person?.uniqueId || fallbackScan.roll}
            {person?.personType ? ` · ${person.personType}` : ""}
            {payload?.campusStatus ? (
              <span className={`ml-2 font-bold ${payload.campusStatus === "IN" ? "text-action-success" : "text-action-danger"}`}>
                {payload.campusStatus}
              </span>
            ) : null}
          </p>
        </div>
        <button
          onClick={onClose}
          className="surface-card p-2 min-w11 min-h11 flex items-center justify-center hover:bg-bg-elevated text-text-muted transition-colors shrink-0"
          aria-label="Close context panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && !payload ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading&hellip;
          </div>
        ) : null}
        {error ? (
          <div className="surface-card text-xs text-action-warning bg-amber-400/10 p-3">{error}</div>
        ) : null}

        {/* This scan */}
        <div className={`rounded-xl p-3 space-y-2 border ${isIn ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <p className="text-xs uppercase font-bold tracking-wider text-text-muted">This record</p>
          <div className="flex items-center gap-3">
            {isIn ? <ArrowDownLeft className="w-5 h-5 text-action-success" /> : <ArrowUpRight className="w-5 h-5 text-action-danger" />}
            <div>
              <p className={`text-sm font-bold ${isIn ? "text-action-success" : "text-action-danger"}`}>
                {isIn ? "Entry" : "Exit"}
                {fallbackScan.reason ? <span className="ml-2 text-xs font-semibold text-text-secondary">({fallbackScan.reason})</span> : null}
              </p>
              <p className="text-xs text-text-muted inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {fallbackScan.gateName || "Gate"} · {fmtTime(fallbackScan.timestamp)}
              </p>
            </div>
          </div>
          {fallbackScan.operatorName ? (
            <p className="text-xs text-text-secondary inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 textfocus-ring" /> Operator: <span className="font-bold text-text-primary">{fallbackScan.operatorName}</span>
            </p>
          ) : null}
        </div>

        {/* Person details */}
        {person ? (
          <div className="space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-text-muted inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Person
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Department", person.department],
                ["Year", person.year != null ? String(person.year) : undefined],
                ["Hostel Block", person.hostelBlock],
                ["Room", person.roomNumber],
              ]
                .filter((pair) => !!pair[1])
                .map(([k, v]) => (
                  <div key={k} className="surface-card bg-bg-base px-3 py-2">
                    <p className="text-xs uppercase font-bold text-text-muted">{k}</p>
                    <p className="font-semibold truncate">{v}</p>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {/* Movement history */}
        {payload?.history && payload.history.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-text-muted inline-flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Today&rsquo;s movements
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {payload.history.slice(0, 12).map((h) => (
                <div key={h.id} className="surface-card flex items-center justify-between text-xs px-2 py-1.5 bg-bg-base">
                  <span className={`inline-flex items-center gap-1 font-bold ${h.direction === "IN" ? "text-action-success" : "text-action-danger"}`}>
                    {h.direction === "IN" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                    {h.direction === "IN" ? "Entry" : "Exit"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-text-muted">
                    <Clock className="size-3.5" /> {fmtTime(h.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="space-y-1.5 pt-1">
          <button
            onClick={handleCorrect}
            className="surface-card w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-primary bg-bg-elevated hover:bg-bg-base transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Correct this scan
          </button>
          <a
            href={historyHref}
            className="surface-card w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary bg-bg-elevated hover:bg-bg-base transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open full history
          </a>
        </div>
      </div>
    </aside>
  );
}
