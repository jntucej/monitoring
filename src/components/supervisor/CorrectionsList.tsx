"use client";
import { useEffect, useState } from "react";
import { User, AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Scan } from "@/lib/types";

export function CorrectionsList() {
  const [corrections, setCorrections] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/supervisor/corrections", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setCorrections(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load corrections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const startEdit = (scan: Scan) => {
    setEditingId(scan.id);
    setDirection(scan.direction);
    setReason(scan.reason || "");
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
  };

  const saveEdit = async (scan: Scan) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/gate/scan/${scan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, reason, isCorrection: true, originalScanId: scan.id }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Correction saved.");
        load();
        setEditingId(null);
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to save"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold">Flagged Events for Correction</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load corrections</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : corrections.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          No corrections needed.
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {corrections.map((correction) => {
            const rollInfo = parseRollNumber(correction.roll);
            const isEditing = editingId === correction.id;
            return (
              <div key={correction.id} className="p-2 rounded-lg hover:bg-white/5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {correction.name} <span className="text-sm text-[var(--text-muted)] font-mono">({correction.roll})</span>
                      </p>
                      {rollInfo && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          {rollInfo.departmentFullName} • {rollInfo.entryMode} • Batch {rollInfo.admissionYear}
                        </p>
                      )}
                      <p className="text-sm text-amber-400">
                        {correction.isManual ? "Manual entry" : "Flagged for review"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(correction.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {correction.gateName ? ` at ${correction.gateName}` : ""}
                    </p>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={direction}
                          onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
                          className="text-sm bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1"
                        >
                          <option value="IN">Entry</option>
                          <option value="OUT">Exit</option>
                        </select>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason"
                          className="text-sm bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1"
                        />
                        <button
                          onClick={() => saveEdit(correction)}
                          disabled={busy}
                          className="text-sm font-medium text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          {busy ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-sm font-medium text-rose-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(correction)}
                        className="text-sm font-medium text-sky-400 hover:underline"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
