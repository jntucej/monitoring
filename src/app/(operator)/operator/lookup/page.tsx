"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";

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
  Mic,
} from "lucide-react";
import { VoiceAssistantModal } from "@/components/operator/VoiceAssistantModal";
import type { VoiceCommand } from "@/lib/voice";

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







function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return <span className="surface-card bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-action-success">Active</span>;
  if (s === "SUSPENDED" || s === "LOCKED") return <span className="surface-card bg-rose-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-action-danger">{s}</span>;
  return <span className="surface-card bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-action-warning">{s}</span>;
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

  // O12: voice-assisted lookup — prefill the id field on high-confidence
  // recognition so the operator confirms before searching.
  const [_voiceOpen, setVoiceOpen] = useState(false);
  const handleVoiceCommand = useCallback((cmd: VoiceCommand) => {
    if (cmd.roll_number) {
      setIdNumber(cmd.roll_number);
      setVoiceOpen(false);
    }
  }, []);

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
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      {/* Search form */}
      <OperatorWidgetBoundary title="Person Lookup">
        {/* O12: voice-assisted lookup — prefill the id field */}
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          <Mic className="h-3.5 w-3.5" aria-hidden />
          Voice lookup
        </button>
        <VoiceAssistantModal onExecuteCommand={handleVoiceCommand} />
        <div className="surface-card bg-bg-elevated p-4 space-y-3 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <label htmlFor="lookup-name" className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Name on ID
              </label>
              <input
                id="lookup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                className="surface-card w-full min-h11 px-3 py-2.5 bg-bg-base text-sm text-text-primary placeholder-[var(--text-muted)] focus:ring-2 focus:ringfocus-ring outline-none"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <label htmlFor="lookup-id" className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Roll / Employee / ID Number
              </label>
              <input
                id="lookup-id"
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") void runLookup(); }}
                placeholder="e.g. 24JJ1A0501"
                className="surface-card w-full min-h11 px-3 py-2.5 bg-bg-base font-mono text-sm text-text-primary uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ringfocus-ring outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runLookup()}
            disabled={lookupState === "loading" || !idNumber.trim()}
            className="surface-card w-full sm:w-auto inline-flex min-h11 items-center justify-center gap-2 bg-action-primary px-4 py-2.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-40 transition disabled:cursor-not-allowed"
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
        <div className="surface-card bg-bg-elevated p-5 flex items-center gap-3 text-sm text-text-muted min-w-0">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
          Looking up {lastQuery}…
        </div>
      )}

      {lookupState === "error" && (
        <div className="surface-card bg-rose-500/10 p-4 flex items-start gap-3 text-sm text-action-danger min-w-0">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Lookup failed</p>
            <p className="text-xs mt-1">{lookupError}</p>
          </div>
        </div>
      )}

      {lookupState === "notfound" && (
        <div className="surface-card bg-amber-500/10 p-4 flex items-start gap-3 text-sm min-w-0">
          <XCircle className="w-5 h-5 text-action-warning shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-action-warning">No match for <span className="font-mono">{lastQuery}</span></p>
            <p className="text-xs text-text-muted mt-1">Double-check the number, or deny entry and log the incident.</p>
          </div>
        </div>
      )}

      {lookupState === "found" && result && (
        <>
          <div className={`rounded-xl border p-4 min-w-0 ${
            result.status === "ACTIVE" ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className={`shrink-0 ${result.status === "ACTIVE" ? "text-action-success" : "text-action-danger"}`}>
                {result.status === "ACTIVE" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-text-primary">{result.name}</p>
                  <StatusBadge status={result.status} />
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs min-w-0">
                  <div><dt className="text-text-muted">Type</dt><dd className="text-text-primary font-medium capitalize">{result.personType}</dd></div>
                  <div><dt className="text-text-muted">ID / Roll</dt><dd className="font-mono text-text-primary">{result.uniqueId}</dd></div>
                  {result.department && <div><dt className="text-text-muted">Department</dt><dd className="text-text-primary">{result.department}</dd></div>}
                  {result.year != null && <div><dt className="text-text-muted">Year</dt><dd className="text-text-primary">{result.year}</dd></div>}
                  {result.roomNumber && <div><dt className="text-text-muted">Room</dt><dd className="text-text-primary">{result.roomNumber}</dd></div>}
                  {result.designation && <div><dt className="text-text-muted">Designation</dt><dd className="text-text-primary">{result.designation}</dd></div>}
                  <div>
                    <dt className="text-text-muted">Campus</dt>
                    <dd className={result.onCampus ? "text-action-success font-semibold" : "text-text-primary"}>
                      {result.onCampus ? "On campus" : "Off campus"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Last scan + gate status */}
          <OperatorWidgetBoundary title="Last Scan & Gate Status">
            <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden min-w-0">
              {lastScanLoading ? (
                <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
                  Loading scan history…
                </div>
              ) : lastScanError ? (
                <div className="p-4 text-sm text-action-danger min-w-0">Could not load scan history.</div>
              ) : lastScanData?.data ? (
                <div className="p-4 space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {lastScanData.data.direction === "IN" ? (
                          <ArrowDownLeft className="w-4 h-4 text-action-success shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-action-danger shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-text-primary">
                          {lastScanData.data.direction === "IN" ? "Entry" : "Exit"} · {fmtTime(lastScanData.data.timestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{lastScanData.data.gate_name || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-xs text-text-muted">
                        {new Date(lastScanData.data.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  {lastScanData.data.reason && (
                    <p className="text-xs text-text-muted">Reason: {lastScanData.data.reason}</p>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center min-w-0">
                  <Clock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No scan history for this person.</p>
                </div>
              )}
            </div>
          </OperatorWidgetBoundary>
        </>
      )}

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
