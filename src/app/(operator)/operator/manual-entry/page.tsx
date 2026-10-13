"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import {
  KeyRound,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  AlertTriangle,
} from "lucide-react";

/* ── response shapes (mirror /api/operator/lookup) ── */

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

type LookupState = "idle" | "loading" | "found" | "notfound" | "error";

function ManualEntryInner() {
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [result, setResult] = useState<LookupPerson | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

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
        { headers: getAuthHeaders(), cache: "no-store" }
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

  const statusTone = (status: string | undefined) => {
    const s = (status ?? "").toUpperCase();
    if (s === "ACTIVE") return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (s === "SUSPENDED" || s === "LOCKED") return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  };

  const personStatusLabel = (status: string | undefined) => {
    const s = (status ?? "").toUpperCase();
    if (s === "ACTIVE") return "Account Active";
    if (s === "SUSPENDED") return "Account Suspended — deny entry";
    if (s === "LOCKED") return "Account Locked — deny entry";
    return status || "Unknown status";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <KeyRound className="w-5 h-5 text-[var(--action-primary)] shrink-0" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
            Manual Entry
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
          Manually verify a person&rsquo;s identity at the gate. Type the name as
          it appears on the ID and their roll / employee / ID number, then look
          them up against the campus records.
        </p>
      </div>

      {/* Lookup form */}
      <WidgetBoundary title="Person Lookup">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-3 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <label
                htmlFor="manual-name"
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
              >
                Name on ID
              </label>
              <input
                id="manual-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <label
                htmlFor="manual-id"
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
              >
                Roll / Employee / ID Number
              </label>
              <input
                id="manual-id"
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runLookup();
                }}
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
      </WidgetBoundary>

      {/* Result card */}
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
            <p className="font-semibold text-amber-300">
              No match for <span className="font-mono">{lastQuery}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Double-check the number, or deny entry and log the incident. New
              persons must be registered by admin before first gate access.
            </p>
          </div>
        </div>
      )}

      {lookupState === "found" && result && (
        <div
          className={`rounded-xl border p-4 min-w-0 ${
            result.status === "ACTIVE"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-rose-500/40 bg-rose-500/10"
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`shrink-0 ${
                result.status === "ACTIVE" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {result.status === "ACTIVE" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {result.name}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(
                    result.status
                  )}`}
                >
                  {personStatusLabel(result.status)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs min-w-0">
                <div>
                  <dt className="text-[var(--text-muted)]">Type</dt>
                  <dd className="text-[var(--text-primary)] font-medium capitalize">
                    {result.personType}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">ID / Roll</dt>
                  <dd className="font-mono text-[var(--text-primary)]">{result.uniqueId}</dd>
                </div>
                {result.department && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Department</dt>
                    <dd className="text-[var(--text-primary)]">{result.department}</dd>
                  </div>
                )}
                {result.year != null && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Year</dt>
                    <dd className="text-[var(--text-primary)]">{result.year}</dd>
                  </div>
                )}
                {result.roomNumber && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Room</dt>
                    <dd className="text-[var(--text-primary)]">{result.roomNumber}</dd>
                  </div>
                )}
                {result.designation && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Designation</dt>
                    <dd className="text-[var(--text-primary)]">{result.designation}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[var(--text-muted)]">Campus</dt>
                  <dd
                    className={
                      result.onCampus
                        ? "text-emerald-400 font-semibold"
                        : "text-[var(--text-primary)]"
                    }
                  >
                    {result.onCampus ? "On campus" : "Off campus"}
                  </dd>
                </div>
              </dl>
              {name.trim() && (
                <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  Name on ID matches:{" "}
                  {name.trim().toLowerCase() === result.name.trim().toLowerCase()
                    ? "yes"
                    : "review carefully"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function OperatorManualEntryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ManualEntryInner />
    </Suspense>
  );
}
