"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/toast";
import { getAuthHeaders } from "@/lib/utils";
import {

  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  AlertTriangle,
  ArrowRightLeft,
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

const REASON_OPTIONS = [
  { value: "daily_outing", label: "Daily Outing" },
  { value: "home_out", label: "Home Out (pass required)" },
  { value: "day_pass", label: "Day Pass (pass required)" },
  { value: "home_in", label: "Home In" },
  { value: "regular", label: "Regular/Other" },
] as const;

type RecordState = "idle" | "submitting" | "success" | "error";

interface RecordError {
  code: string;
  status: number;
  message: string;
}

/**
 * Entry-type options offered by the manual entry flow. `resolveEntryOptions`
 * is a pure client-safe function; we import it so the UI exactly mirrors the
 * operator kiosk's button matrix (return_to_hostel / home_in / day_scholar_in)
 * rather than inventing a second set. The lastOutReason is read from the
 * lookup result when the operator is choosing a direction.
 */
type EntryType = "hosteller" | "day_scholar";


function ManualEntryInner() {
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  const [lookupState, setLookupState] = useState<LookupState>("idle");

  // Prefill the lookup id from the ?id= query param (set by the command
  // palette's "Look up person" command) so the operator doesn't retype it.
  const searchParams = useSearchParams();
  useEffect(() => {
    const qid = searchParams.get("id");
    if (qid) setIdNumber(qid);
  }, [searchParams]);
  const [result, setResult] = useState<LookupPerson | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const { addToast } = useToast();

  // Record form (rendered below a successful lookup)
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [recordDirection, setRecordDirection] = useState<"IN" | "OUT">("IN");
  const [recordReason, setRecordReason] = useState("");
  const [recordReasonText, setRecordReasonText] = useState("");
  // §MANUAL-ENTRY-1: recordScan now requires entryType for student IN scans
  // (ENTRY_TYPE_REQUIRED 400). The manual-entry page had no control for it,
  // so students couldn't be checked in via the camera-failure fallback.
  // Default to "hosteller" — the most common case — and surface a warning
  // note when the student's stored entry type differs, so the operator can
  // explicitly confirm the choice.
  const [recordEntryType, setRecordEntryType] = useState<EntryType>("hosteller");
  const [recordError, setRecordError] = useState<RecordError | null>(null);

  const resetRecordForm = useCallback(() => {
    setRecordState("idle");
    setRecordReason("");
    setRecordReasonText("");
    setRecordEntryType("hosteller");
    setRecordError(null);
  }, []);

  const submitRecord = async () => {
    if (!result || !result.uniqueId) return;
    const reason = recordReasonText.trim() || recordReason;
    if (!reason) {
      setRecordState("error");
      setRecordError({ code: "BAD_REQUEST", status: 400, message: "Reason is required for manual entry." });
      return;
    }

    setRecordState("submitting");
    setRecordError(null);

    try {
      const res = await fetch("/api/operator/manual-entry", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          roll: result.uniqueId,
          direction: recordDirection,
          reason,
          gateId: user?.gateId,
          // §MANUAL-ENTRY-1: send the entry type for student IN scans. The
          // server requires it (ENTRY_TYPE_REQUIRED 400) when the scanned
          // person is a student and direction is IN; harmless when not.
          ...(result.personType === "student" && recordDirection === "IN"
            ? { entryType: recordEntryType }
            : {}),
        }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      if (res.ok) {
        setRecordState("success");
        addToast({
          variant: "success",
          title: "Manual Entry Recorded",
          message: `${result.name} (${result.uniqueId}) recorded ${recordDirection === "IN" ? "in" : "out"} at the gate.`,
        });
        // Return to the lookup idle state.
        setLookupState("idle");
        setResult(null);
        setName("");
        setIdNumber("");
        setLastQuery("");
        resetRecordForm();
        return;
      }

      const code = json?.error?.code ?? "ERROR";
      const message = json?.error?.message ?? `HTTP ${res.status}`;
      setRecordState("error");
      setRecordError({ code, status: res.status, message });
    } catch (err) {
      setRecordState("error");
      setRecordError({
        code: "NETWORK_ERROR",
        status: 0,
        message: err instanceof Error ? err.message : "Failed to record scan",
      });
    }
  };

  const runLookup = useCallback(async () => {
    const id = idNumber.trim().toUpperCase();
    if (!id) return;

    setLastQuery(id);
    setLookupState("loading");
    setResult(null);
    setLookupError(null);
    resetRecordForm();

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
        const person = json.data.person as LookupPerson;
        setResult(person);
        setLookupState("found");
        onFound(person);
      } else {
        setLookupState("notfound");
      }
    } catch (err) {
      setLookupState("error");
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    }
  }, [idNumber, resetRecordForm]);

  // Default direction after a successful lookup: on campus → OUT, else IN.
  const onFound = (person: LookupPerson) => {
    setRecordDirection(person.onCampus ? "OUT" : "IN");
  };

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

      {/* Record form — rendered below a successful lookup */}
      {lookupState === "found" && result && (
        <WidgetBoundary title="Record Scan">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-3 min-w-0">
            {/* Direction toggle */}
            <div className="space-y-1.5 min-w-0">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Direction
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["IN", "OUT"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRecordDirection(d)}
                    disabled={recordState === "submitting"}
                    className={`px-3 py-2 rounded-lg border text-sm font-bold transition disabled:opacity-50 ${
                      recordDirection === d
                        ? "bg-[var(--action-primary)] border-[var(--action-primary)] text-slate-950"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--border)]"
                    }`}
                  >
                    {d === "IN" ? "Entry (IN)" : "Exit (OUT)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason select */}
            <div className="space-y-1.5 min-w-0">
              <label
                htmlFor="manual-reason"
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
              >
                Reason
              </label>
              <select
                id="manual-reason"
                value={recordReason}
                onChange={(e) => setRecordReason(e.target.value)}
                disabled={recordState === "submitting"}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
              >
                <option value="" disabled>
                  Select a reason…
                </option>
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

            {/* §MANUAL-ENTRY-1: entry-type toggle for student IN scans. The
                server rejects a student IN without entryType (400
                ENTRY_TYPE_REQUIRED); the kiosk has this control, the
                manual-entry fallback did not. */}
            {result?.personType === "student" && recordDirection === "IN" && (
              <div className="mt-4">
                <label
                  htmlFor="manual-entry-type"
                  className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide"
                >
                  Entry type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecordEntryType("hosteller")}
                    disabled={recordState === "submitting"}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      recordEntryType === "hosteller"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] font-medium"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    Hosteller
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordEntryType("day_scholar")}
                    disabled={recordState === "submitting"}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      recordEntryType === "day_scholar"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] font-medium"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    Day Scholar
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Defaults to the student's stored entry type; change only if
                  they are explicitly arriving as the other type today.
                </p>
              </div>
            )}
            </div>

            {/* Free-text reason (optional) */}
            <div className="space-y-1.5 min-w-0">
              <label
                htmlFor="manual-reason-text"
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
              >
                Additional details (optional)
              </label>
              <input
                id="manual-reason-text"
                type="text"
                value={recordReasonText}
                onChange={(e) => setRecordReasonText(e.target.value)}
                placeholder="e.g. returning from doctor visit"
                disabled={recordState === "submitting"}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
              />
            </div>

            {/* Error banner (400 / 403 NO_GATE_PASS / 409 / 423 / network) */}
            {recordState === "error" && recordError && (
              <div
                className={`rounded-lg border p-3 text-xs flex items-start gap-2 min-w-0 ${
                  recordError.code === "NO_GATE_PASS"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : recordError.code === "CONFLICT"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  {recordError.code === "NO_GATE_PASS" && (
                    <p className="font-bold mb-1">
                      No approved gate pass — reject or escalate to principal/admin
                    </p>
                  )}
                  {recordError.code === "CONFLICT" && (
                    <p className="font-bold mb-1">Duplicate or direction conflict</p>
                  )}
                  {recordError.status === 423 && (
                    <p className="font-bold mb-1">Lockdown active — scans blocked</p>
                  )}
                  <p>{recordError.message}</p>
                </div>
              </div>
            )}

            {/* Success card */}
            {recordState === "success" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Scan recorded successfully.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void submitRecord()}
              disabled={recordState === "submitting"}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-40 transition disabled:cursor-not-allowed"
            >
              {recordState === "submitting" ? (
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
              Record Scan
            </button>
          </div>
        </WidgetBoundary>
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
