"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Clock, CheckCircle2, XCircle, FileDown, History, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import type { GatePass } from "@/lib/types";
import { getPassTypeName } from "@/hooks/usePassTypes";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import type { Period } from "@/lib/period";
import { getPeriod } from "@/lib/period";
import { PassLiveTracker } from "@/components/shared/pass/PassLiveTracker";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { passInspection } from "@/components/shared/inspectionModels";
import { useIsSakuga } from "@/components/student/useIsSakuga";

function expiryLabel(to: string, status: string): string {
  if (status === "REJECTED") return "Rejected";
  if (status === "PENDING" || status === "APPROVED_PARENT" || status === "APPROVED_ADMIN") return "Awaiting approval";
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `Expires in ${Math.floor(ms / 60_000)} min`;
  if (hours < 24) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function statusStyle(s: string) {
  if (s === "APPROVED" || s === "COMPLETED") return { text: "text-action-success", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="size-4 text-action-success" /> };
  if (s === "REJECTED") return { text: "text-action-danger", bg: "bg-rose-500/10", icon: <XCircle className="size-4 text-action-danger" /> };
  return { text: "text-action-warning", bg: "bg-amber-500/10", icon: <Clock className="size-4 text-action-warning" /> };
}

export interface ActivePassesProps {
  /** Fired when a pass row is selected, so the page can surface the
   * "focus a document" pivot (SelfActionLoop). */
  onSelectPass?: (ticketId: string) => void;
}

export function ActivePasses({ onSelectPass }: ActivePassesProps) {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [history, setHistory] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(getPeriod("this-month"));
  const [showHistory, setShowHistory] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [activePass, setActivePass] = useState<string | null>(null);
  const isSakuga = useIsSakuga();
  const user = useAuthStore((s) => s.user);
  const { exportCSV } = useExport();

  const load = useCallback(async () => {
    const roll = user?.uniqueId ?? user?.studentDetails?.roll ?? null;
    if (!roll) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
      }
      const json = await res.json().catch(() => ({}));
      const all: GatePass[] = Array.isArray(json.data) ? json.data : [];
      setPasses(all);
      setError(null);
      setLoading(false);
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  }, [user?.uniqueId, user?.studentDetails?.roll]);

  // Period-filtered history
  const periodFrom = useMemo(() => period.from.slice(0, 10), [period]);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(
    () => passes.filter((p) => p.from >= periodFrom && p.to <= todayStr || p.finalStatus === "PENDING" || p.finalStatus === "COMPLETED"),
    [passes, periodFrom, todayStr]
  );

  // Usage delta: this period vs previous same-length window
  const usageDelta = useMemo(() => {
    const periodDays = Math.max(1, Math.round((new Date(period.to).getTime() - new Date(period.from).getTime()) / 86_400_000));
    const prevFrom = new Date(period.from);
    prevFrom.setDate(prevFrom.getDate() - periodDays);
    const prevFromStr = prevFrom.toISOString().slice(0, 10);
    const prevToStr = period.from.slice(0, 10);
    const prevCount = passes.filter((p) => p.from >= prevFromStr && p.to <= prevToStr).length;
    const curCount = filtered.length;
    return { cur: curCount, prev: prevCount, delta: curCount - prevCount, periodDays };
  }, [passes, filtered, period]);

  const handleExportHistory = () => {
    exportCSV(
      filtered.map((p) => ({
        type: getPassTypeName(p.reason),
        from: p.from,
        to: p.to,
        status: p.finalStatus,
        requestedAt: p.requestedAt,
      })),
      [
        { key: "type", header: "Pass Type" },
        { key: "from", header: "From" },
        { key: "to", header: "To" },
        { key: "status", header: "Status" },
        { key: "requestedAt", header: "Requested" },
      ],
      `pass_history_${period.key}.csv`
    );
  };

  // Initial load + visibility-aware polling (no raw setInterval)
  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  usePolling(load, { intervalMs: 30_000 });

  return (
    <div className="surface-card bg-bg-surface p-6">
      <h3 className="font-semibold mb-4">Active Passes</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="surface-card flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-rose-500/10">
          <p className="text-sm text-action-danger">Could not load passes: {error}</p>
          {isSakuga ? (
            <sakuga-button
              onClick={load}
              className="shrink-0"
            >
              Retry
            </sakuga-button>
          ) : (
          <button
            onClick={load}
            className="surface-card px-3 py-1 bg-rose-500/20 text-action-danger text-xs font-bold hover:bg-rose-500/30 transition shrink-0"
          >
            Retry
          </button>
          )}
        </div>
      ) : passes.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">No passes yet.</p>
      ) : (
        <div className="space-y-4">
          {passes.map((pass) => {
            const s = statusStyle(pass.finalStatus);
            const active = pass.finalStatus !== "REJECTED" && pass.finalStatus !== "COMPLETED";
            return (
              <div
                key={pass.id}
                className={`p-3 rounded-lg ${s.bg} cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => {
                  setActivePass(pass.id);
                  onSelectPass?.(pass.id);
                }}
              >
                <div className="flex items-center gap-4">
                  {s.icon}
                  <div className="flex-1">
                    <p className={`font-medium ${s.text}`}>{getPassTypeName(pass.reason)}</p>
                    <p className={`text-sm ${s.text} opacity-80`}>
                      {expiryLabel(pass.to, pass.finalStatus)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="surface-card text-xs font-semibold uppercase tracking-wider bg-black/20 px-2 py-1">
                      {pass.finalStatus}
                    </span>
                    {pass.parentStatus !== 'APPROVED' && (
                      <span className="text-xs opacity-60">Parent: {pass.parentStatus}</span>
                    )}
                    {pass.adminStatus !== 'APPROVED' && (
                      <span className="text-xs opacity-60">Admin: {pass.adminStatus}</span>
                    )}
                    {active && (
                      isSakuga ? (
                        <sakuga-button
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setTrackId(trackId === pass.id ? null : pass.id); }}
                          className="text-[11px] font-medium mt-0.5"
                        >
                          {trackId === pass.id ? "Hide tracker" : "Live tracker"}
                        </sakuga-button>
                      ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTrackId(trackId === pass.id ? null : pass.id); }}
                        className="text-[11px] font-medium text-action-primary hover:underline mt-0.5"
                      >
                        {trackId === pass.id ? "Hide tracker" : "Live tracker"}
                      </button>
                      )
                    )}
                  </div>
                </div>
                {/* The pass loop (S4): live "where is it" tracker */}
                {active && trackId === pass.id && (
                  <div className="mt-3 pl-10">
                    <PassLiveTracker passId={pass.id} expectedReturnAt={pass.to} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Usage KPI */}
      <div className="mt-3 sm:mt-4 w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted uppercase">Usage this period</span>
          <span className="text-xs text-text-muted tabular-nums">
            {usageDelta.cur} this · {usageDelta.prev} prev
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-lg font-bold text-text-primary tabular-nums">{usageDelta.cur}</span>
          {usageDelta.delta > 0 && (
            <span className="inline-flex items-center text-xs text-emerald-500">
              <TrendingUp className="h-3 w-3" /> +{usageDelta.delta}
            </span>
          )}
          {usageDelta.delta < 0 && (
            <span className="inline-flex items-center text-xs text-rose-500">
              <TrendingDown className="h-3 w-3" /> {usageDelta.delta}
            </span>
          )}
          {usageDelta.delta === 0 && <span className="text-xs text-text-muted">no change</span>}
        </div>
      </div>

      {/* History toggle + period + export */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {isSakuga ? (
            <sakuga-toggle
              checked={showHistory}
              onChange={((v: unknown) => setShowHistory(Boolean(v))) as any}
            />
          ) : (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-action-primary"
          >
            <History className="h-3.5 w-3.5" />
            {showHistory ? "Hide history" : "View history"}
          </button>
          )}
          <div className="flex items-center gap-2">
            <PeriodPicker value={period} onChange={setPeriod} />
            <button
              type="button"
              onClick={handleExportHistory}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {showHistory && filtered.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {filtered.slice(0, 15).map((p) => (
              <div key={p.id} className="rounded-lg bg-bg-elevated border border-border px-3 py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-text-primary">{getPassTypeName(p.reason)}</span>
                  <span className="ml-2 text-text-muted tabular-nums">{p.from.slice(0, 10)} → {p.to.slice(0, 10)}</span>
                </div>
                <span className={`uppercase font-medium ${
                  p.finalStatus === "COMPLETED" ? "text-emerald-500" :
                  p.finalStatus === "PENDING" ? "text-amber-500" : "text-rose-500"
                }`}>
                  {p.finalStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standardized inspection model for a pass (the registry). */}
      {(() => {
        const sel = passes.find((p) => p.id === activePass) ?? null;
        const model = sel ? passInspection(sel as any) : null;
        return (
          <EntityInspector inspection={model} onClose={() => setActivePass(null)} />
        );
      })()}
    </div>
  );
}
