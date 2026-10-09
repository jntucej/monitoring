"use client";

import { useEffect, useState } from "react";
import { X, ArrowDownLeft, ArrowUpRight, ShieldCheck, History, Loader2 } from "lucide-react";
import type { Scan, Person } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";

interface ScanDetailModalProps {
  scan: Scan | null;
  onClose: () => void;
}

interface PersonPayload {
  person: Person;
  campusStatus?: string;
  lastScan?: Scan | null;
  history?: Scan[];
}

export function ScanDetailModal({ scan, onClose }: ScanDetailModalProps) {
  const [payload, setPayload] = useState<PersonPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scan) {
      setPayload(null);
      setError(null);
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

  if (!scan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85dvh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">{payload?.person?.fullName || scan.name}</h3>
            <p className="text-xs font-mono text-[var(--text-muted)]">
              {payload?.person?.uniqueId || scan.roll}
              {payload?.person?.personType ? ` · ${payload.person.personType}` : ""}
              {payload?.campusStatus ? (
                <span className={`ml-2 font-bold ${payload.campusStatus === "IN" ? "text-emerald-400" : "text-[var(--action-danger)]"}`}>
                  ON CAMPUS: {payload.campusStatus}
                </span>
              ) : null}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-base)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading overview…
          </div>
        ) : error ? (
          <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">{error}</div>
        ) : null}

        {/* This scan */}
        <div className={`rounded-xl p-4 space-y-2 border ${scan.direction === "IN" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">This Record</p>
          <div className="flex items-center gap-3">
            {scan.direction === "IN" ? (
              <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
            ) : (
              <ArrowUpRight className="w-6 h-6 text-[var(--action-danger)]" />
            )}
            <div>
              <p className={`font-bold text-sm ${scan.direction === "IN" ? "text-emerald-400" : "text-[var(--action-danger)]"}`}>
                {scan.direction === "IN" ? "ENTRY" : "EXIT"}
                {scan.reason ? <span className="ml-2 text-[10px] font-semibold text-[var(--text-secondary)]">({scan.reason})</span> : null}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {new Date(scan.timestamp).toLocaleString()} · {scan.gateName || "Gate"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1.5 pt-1 flex-wrap">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--focus-ring)]" />
            Processed by operator: <span className="font-bold text-[var(--text-primary)]">{scan.operatorName || "—"}</span>
            {scan.isManual ? <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400 text-[9px] font-bold">MANUAL</span> : null}
            {scan.isCorrection ? <span className="px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-400 text-[9px] font-bold">CORRECTION</span> : null}
          </p>
        </div>

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
                <div key={k} className="bg-[var(--bg-base)] rounded-lg px-3 py-2">
                  <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">{k}</p>
                  <p className="font-semibold truncate">{v}</p>
                </div>
              ))}
          </div>
        ) : null}

        {/* Movement history */}
        {payload?.history && payload.history.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] inline-flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Recent Movements
            </p>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {payload.history.slice(0, 12).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-[var(--bg-base)]">
                  <span className={`inline-flex items-center gap-1 font-bold ${h.direction === "IN" ? "text-emerald-400" : "text-[var(--action-danger)]"}`}>
                    {h.direction === "IN" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {h.direction === "IN" ? "Entry" : "Exit"}
                  </span>
                  <span className="text-[var(--text-muted)]">{new Date(h.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

