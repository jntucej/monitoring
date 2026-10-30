"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from "lucide-react";

interface LookupPerson {
  id: string;
  name: string;
  uniqueId: string;
  personType: string;
  status: string;
  department: string | null;
  year: number | null;
  roomNumber: string | null;
  designation?: string | null;
  onCampus: boolean;
}

interface LookupResponse {
  success: boolean;
  data: { found: boolean; id: string; person?: LookupPerson };
}

interface LastScan {
  id: string;
  direction: string;
  timestamp: string;
  gate_name: string | null;
  reason: string | null;
}

interface LastScanResponse {
  success: boolean;
  data: LastScan | null;
}

type LookupState = "idle" | "loading" | "found" | "notfound" | "error";

function safeText(v: string | number | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">Active</span>;
  if (s === "SUSPENDED" || s === "LOCKED") return <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-400">{s}</span>;
  return <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">{s}</span>;
}

function OperatorLookupInner() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  const searchParams = useSearchParams();
  useEffect(() => {
    const qid = searchParams.get("id");
    if (qid) setIdNumber(qid);
  }, [searchParams]);

  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [result, setResult] = useState<LookupPerson | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const {
    data: lastScanData,
    loading: lastScanLoading,
    error: lastScanError,
  } = useApiResource<LastScanResponse>(
    result?.id ? `/api/operator/last-scan?userId=${encodeURIComponent(result.id)}` : null,
    { ttlMs: 15_000 },
  );

  const refreshAll = useCallback(async () => {
    if (result?.id) {
      // force refresh last scan
    }
  }, [result?.id]);

  usePolling(refreshAll, { intervalMs: 15_000, enabled: !!user });

  const runLookup = useCallback(async () => {
    const id = idNumber.trim().toUpperCase();
    if (!id) return;
    setLastQuery(id);
    setLookupState("loading");
    setResult(null);
    setLookupError(null);

    try {
      const res = await fetch(
        `/api/operator/lookup?id=${encodeURIComponent(id)}`,
        { headers: getAuthHeaders(), cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLookupState("error");
        setLookupError(json.error?.message || `HTTP ${res.status}`);
        return;
      }
      if (json.data?.found && json.data?.person) {
        setResult(json.data.person as LookupPerson);
        setLookupState("found");
      } else {
        setLookupState("notfound");
      }
    } catch (err) {
      setLookupState("error");
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    }
  }, [idNumber]);

  const fmtTime = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {/* Search form */}
      <OperatorWidgetBoundary title="Person Lookup">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-3 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <label htmlFor="lookup-name" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Name on ID
              </label>
              <input
                id="lookup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <label htmlFor="lookup-id" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Roll / Employee / ID Number
              </label>
              <input
                id="lookup-id"
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") void runLookup(); }}
                placeholder="e.g. 24JJ1A0501"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] font-mono text-sm text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runLookup()}
            disabled={lookupState === "loading" || !idNumber.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-40 transition disabled:cursor-not-allowed"
          >
            {lookupState === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Look Up Person
          </button>
        </div>
      </OperatorWidgetBoundary>

      {/* Results */}
      {lookupState === "loading" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 flex items-center gap-3 text-sm text-[var(--text-muted)] min-w-0">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
          Looking up {lastQuery}…
        </div>
      )}

      {lookupState === "error" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3 text-sm text-rose-300 min-w-0">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Lookup failed</p>
            <p className="text-xs mt-1">{lookupError}</p>
          </div>
        </div>
      )}

      {lookupState === "notfound" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-sm min-w-0">
          <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-amber-300">No match for <span className="font-mono">{lastQuery}</span></p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Double-check the number, or deny entry and log the incident.</p>
          </div>
        </div>
      )}

      {lookupState === "found" && result && (
        <>
          <div className={`rounded-xl border p-4 min-w-0 ${
            result.status === "ACTIVE" ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className={`shrink-0 ${result.status === "ACTIVE" ? "text-emerald-400" : "text-rose-400"}`}>
                {result.status === "ACTIVE" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{result.name}</p>
                  <StatusBadge status={result.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs min-w-0">
                  <div><dt className="text-[var(--text-muted)]">Type</dt><dd className="text-[var(--text-primary)] font-medium capitalize">{result.personType}</dd></div>
                  <div><dt className="text-[var(--text-muted)]">ID / Roll</dt><dd className="font-mono text-[var(--text-primary)]">{result.uniqueId}</dd></div>
                  {result.department && <div><dt className="text-[var(--text-muted)]">Department</dt><dd className="text-[var(--text-primary)]">{result.department}</dd></div>}
                  {result.year != null && <div><dt className="text-[var(--text-muted)]">Year</dt><dd className="text-[var(--text-primary)]">{result.year}</dd></div>}
                  {result.roomNumber && <div><dt className="text-[var(--text-muted)]">Room</dt><dd className="text-[var(--text-primary)]">{result.roomNumber}</dd></div>}
                  {result.designation && <div><dt className="text-[var(--text-muted)]">Designation</dt><dd className="text-[var(--text-primary)]">{result.designation}</dd></div>}
                  <div>
                    <dt className="text-[var(--text-muted)]">Campus</dt>
                    <dd className={result.onCampus ? "text-emerald-400 font-semibold" : "text-[var(--text-primary)]"}>
                      {result.onCampus ? "On campus" : "Off campus"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Last scan + gate status */}
          <OperatorWidgetBoundary title="Last Scan & Gate Status">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
              {lastScanLoading ? (
                <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
                  Loading scan history…
                </div>
              ) : lastScanError ? (
                <div className="p-4 text-sm text-rose-400 min-w-0">Could not load scan history.</div>
              ) : lastScanData?.data ? (
                <div className="p-4 space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {lastScanData.data.direction === "IN" ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {lastScanData.data.direction === "IN" ? "Entry" : "Exit"} · {fmtTime(lastScanData.data.timestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{lastScanData.data.gate_name || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(lastScanData.data.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  {lastScanData.data.reason && (
                    <p className="text-xs text-[var(--text-muted)]">Reason: {lastScanData.data.reason}</p>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center min-w-0">
                  <Clock className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">No scan history for this person.</p>
                </div>
              )}
            </div>
          </OperatorWidgetBoundary>
        </>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function OperatorLookupPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorLookupInner />
    </Suspense>
  );
}
