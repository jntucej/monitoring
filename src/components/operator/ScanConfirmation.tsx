"use client";

import { motion } from "framer-motion";
import {
  User, CheckCircle2, LogIn, Home, Sun, Clock, X, Briefcase, ShieldAlert, Flag,
} from "lucide-react";
import { ExitReason, Student, ScanDirection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { useAuthStore } from "@/stores/authStore";
import { useOperatorStore } from "@/stores/operatorStore";
import { operatorIcon } from "@/config/operator-icons";
import type { Recommendation } from "@/lib/operator-recommend";

/**
 * Canonical entry-type selection: the operator's choice of who the student is
 * (hosteller or day_scholar). Drives which IN/OUT buttons are offered and is
 * persisted via POST /api/operator/entry-type.
 */
export type EntryType = "hosteller" | "day_scholar";

interface ScanConfirmationProps {
  student: Student;
  /**
   * Backwards-compatible: an optional third argument carries the entry type
   * when the operator confirms an IN scan (hosteller vs day_scholar). OUT
   * scans carry a reason instead; entryType is ignored for them.
   *
   * The fourth argument is the raw IN button id the operator tapped
   * (return_to_hostel / home_in / day_scholar_in). The caller forwards it to
   * the operator store so the entry-type route can decide whether to write
   * the canonical entry type. Ignored for OUT scans.
   */
  onConfirm: (direction: ScanDirection, reason?: ExitReason, entryType?: EntryType, buttonId?: EntryButtonId) => void | Promise<void>;
  onCancel: () => void;
  suggestedDirection?: ScanDirection;
  /** Authoritative current IN/OUT condition of the scanned person. */
  campusStatus?: "IN" | "OUT" | null;
  /**
   * Reason recorded on the person's most recent OUT scan (null when they're IN
   * or the occupancy is unknown). Drives the hosteller re-entry button label:
   * daily_outing → "Return to Hostel"; home_out / day_pass → "Home In".
   */
  lastOutReason?: string | null;
  /**
   * Live entry-type selection read from student_details.current_entry_type.
   * When null the operator has not yet chosen a type; an OUT + null state
   * defaults to hosteller (per spec) and is logged.
   */
  currentEntryType?: EntryType | null;
  isInline?: boolean;
}

/** IN-movement button ids produced by resolveEntryOptions (gate-operator
 *  entry button matrix). Mapped to an entry type + a stable label. */
type EntryButtonId = "return_to_hostel" | "home_in" | "day_scholar_in";
export type ActionButtonCode = EntryButtonId | ExitReason;

const ENTRY_BUTTON_META: Record<EntryButtonId, {
  name: string;
  icon: React.ElementType;
  entryType: EntryType;
}> = {
  return_to_hostel: { name: "Return to Hostel", icon: Sun, entryType: "hosteller" },
  home_in: { name: "Home In", icon: Home, entryType: "hosteller" },
  day_scholar_in: { name: "Outing In", icon: Sun, entryType: "day_scholar" },
};

/** Canonical exit-reason labels for OUT button display. */
const EXIT_REASON_LABELS: Record<string, string> = {
  daily_outing: "Daily Outing",
  day_pass: "Day Pass",
  home_out: "Home Out",
  day_scholar_out: "Day Scholar Out",
  emergency: "Emergency",
};

function normalizeEntryType(value: unknown): EntryType | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (s === "hosteller" || s === "hostel" || s === "hm" || s === "hf") return "hosteller";
  if (s === "day_scholar" || s === "day scholar" || s === "day_scholars" || s === "dm" || s === "df") return "day_scholar";
  return null;
}

/** Build the label string for a recommended button: "⬆ ENTRY · Home In" or "⬇ EXIT · Day Pass". */
function buildDirectionLabel(direction: ScanDirection, label: string): string {
  const dirIcon = direction === "IN" ? "⬆" : "⬇";
  const dirWord = direction === "IN" ? "ENTRY" : "EXIT";
  return `${dirIcon} ${dirWord} · ${label}`;
}

export function ScanConfirmation({
  student,
  onConfirm,
  onCancel,
  suggestedDirection = "IN",
  campusStatus = null,
  currentEntryType = null,
  lastOutReason = null,
  isInline = false,
}: ScanConfirmationProps) {
  // Live entry type: the prop wins, falling back to the stored
  // studentDetails.current_entry_type on the person.
  const effectiveEntryType =
    normalizeEntryType(currentEntryType) ??
    normalizeEntryType(student.studentDetails?.currentEntryType ?? student.currentEntryType);

  const operatorStore = useOperatorStore();

  // Photo verification state
  const [photoVerified, setPhotoVerified] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [selectedDirection, setSelectedDirection] = useState<ScanDirection | null>(null);
  const [selectedReason, setSelectedReason] = useState<ExitReason | null>(null);
  const [selectedEntryType, setSelectedEntryType] = useState<EntryType | null>(null);
  const [approvedPasses, setApprovedPasses] = useState<any[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [isFlagged, setIsFlagged] = useState(
    student.status === "SUSPENDED" || !!student.flagStatus
  );
  const [flaggingLoading, setFlaggingLoading] = useState(false);

  const handleToggleFlagAccount = async () => {
    if (flaggingLoading || !student?.id) return;
    const nextStatus = isFlagged ? "ACTIVE" : "SUSPENDED";
    const nextFlagStatus = isFlagged ? null : "MANUAL_LOCKDOWN";
    setFlaggingLoading(true);
    try {
      const authStore = useAuthStore.getState();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authStore.token) headers["Authorization"] = `Bearer ${authStore.token}`;
      if (authStore.user?.currentSessionToken) headers["X-Session-Token"] = authStore.user.currentSessionToken;

      const res = await fetch(`/api/users/${student.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: nextStatus, flagStatus: nextFlagStatus }),
      });
      if (res.ok) {
        setIsFlagged(!isFlagged);
      }
    } catch (e) {
      console.error("Failed to update account flag status:", e);
    } finally {
      setFlaggingLoading(false);
    }
  };

  // Start photo verification countdown when component mounts
  useEffect(() => {
    setPhotoVerified(false);
    setCountdown(2);
    setSelectedDirection(null);
    setSelectedReason(null);
    setSelectedEntryType(null);
    setApprovedPasses([]);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhotoVerified(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [student.id]);

  useEffect(() => {
    const fetchApprovedPasses = async () => {
      const rollNum = student.uniqueId || student.roll || student.id;
      if (!rollNum) return;
      setLoadingPasses(true);
      try {
        const authStore = useAuthStore.getState();
        const token = authStore.token;
        const sessionToken = authStore.user?.currentSessionToken;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        if (sessionToken) {
          headers["X-Session-Token"] = sessionToken;
        }
        const res = await fetch(`/api/passes?roll=${encodeURIComponent(rollNum)}&status=APPROVED`, { headers });

        if (!res.ok) {
          console.warn(`Pass API returned status ${res.status}`);
          setApprovedPasses([]);
          setLoadingPasses(false);
          return;
        }

        const result = await res.json();
        // Handle session expiry in pass lookup
        if (res.status === 401 && result?.error?.code === "SESSION_EXPIRED") {
          const authStore = useAuthStore.getState();
          authStore.logout();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return;
        }
        if (result.success && result.data) {
          setApprovedPasses(result.data);
        } else {
          setApprovedPasses([]);
        }
      } catch (err) {
        console.error("Error loading approved passes:", err);
      } finally {
        setLoadingPasses(false);
      }
    };
    fetchApprovedPasses();
  }, [student.id, student.uniqueId, student.roll]);

  // Whether a stored entry type is missing for an IN student (log once).
  const inWithUnknownType = campusStatus === "IN" && !effectiveEntryType;
  useEffect(() => {
    if (inWithUnknownType) {
      console.warn(
        `[ScanConfirmation] IN student with no stored entry type; defaulting to hosteller scope.`,
      );
    }
  }, [inWithUnknownType]);

  // A stored entry type missing on OUT means the operator will pick now.
  const outWithUnknownType = campusStatus === "OUT" && !effectiveEntryType;

  const handleConfirmClick = async (
    direction: ScanDirection,
    reason?: ExitReason,
    entryType?: EntryType,
    buttonId?: EntryButtonId,
  ) => {
    if (!photoVerified || isFlagged) {
      return;
    }
    setSelectedDirection(direction);
    setSelectedReason(reason ?? null);
    setSelectedEntryType(entryType ?? null);
    await onConfirm(direction, reason, entryType, buttonId);
  };

  // Map a reason value to a stable token so pass-reason matching is consistent.
  const normalizeReason = (r?: string) => {
    if (!r) return "";
    const s = r.trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (s === "dailyouting" || s === "outing" || s === "dayout") return "daily_outing";
    if (s === "homein") return "home_in";
    if (s === "homeout" || s === "leave") return "home_out";
    if (s === "daypass") return "day_pass";
    if (s === "emergency") return "daily_outing";
    if (s === "regular") return "regular";
    if (s === "dayscholarout") return "day_scholar_out";
    return s;
  };

  const hasApprovedPassFor = (code: string, name: string) =>
    approvedPasses.some((p) => {
      if (!p.reason) return false;
      if (p.reason === code || p.reason === name) return true;
      if (p.reason.toLowerCase() === code.toLowerCase() || p.reason.toLowerCase() === name.toLowerCase())
        return true;
      return normalizeReason(p.reason) === normalizeReason(code) || normalizeReason(p.reason) === normalizeReason(name);
    });

  // ── Auto-recommendation (principle 3: 1 recommended + 2 alternatives) ──
  // The recommendation is computed from the store's live campus status,
  // last OUT reason, entry type, and the approved-pass count.
  const recommendation = useMemo<Recommendation | null>(() => {
    if (!student) return null;
    return operatorStore.getRecommendation(student, approvedPasses.length);
  }, [student, operatorStore, approvedPasses.length]);

  // Resolve a recommendation action payload into the onConfirm args.
  const handleRecommendationConfirm = async (
    direction: ScanDirection,
    reason?: ExitReason,
    entryType?: EntryType,
    buttonId?: EntryButtonId,
  ) => {
    if (!photoVerified || isFlagged) return;
    setSelectedDirection(direction);
    setSelectedReason(reason ?? null);
    setSelectedEntryType(entryType ?? null);
    await onConfirm(direction, reason, entryType, buttonId);
  };

  // ── Overdue pass strip (amber; hosteller IN only) ────────────────────────
  // When a hosteller has an APPROVED daily_outing or day_pass pass whose window
  // has lapsed, surface how long it has been overdue. home_out never overdue.
  const overdueInfo = useMemo(() => {
    if (campusStatus !== "IN" || effectiveEntryType !== "hosteller") return null;
    const now = Date.now();
    const normReason = (r?: string) => normalizeReason(r);
    const fmtDur = (ms: number) => {
      const totalMin = Math.max(0, Math.round(ms / 60000));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${h}h ${m}m`;
    };
    for (const p of approvedPasses as Array<{ reason?: string; to_datetime?: string; from_datetime?: string }>) {
      const code = normReason(p.reason);
      if (code !== "daily_outing" && code !== "day_pass") continue;
      const toMs = p.to_datetime ? Date.parse(p.to_datetime) : NaN;
      const fromMs = p.from_datetime ? Date.parse(p.from_datetime) : NaN;
      // "in window" means the pass was active at some point (from <= now) and
      // is now past its end (overdue). A not-yet-started pass is not overdue.
      const started = Number.isNaN(fromMs) || fromMs <= now;
      if (!started || Number.isNaN(toMs) || toMs >= now) continue;
      const overdueMs = now - toMs;
      const label = code === "daily_outing" ? "Overdue Daily Outing" : "Overdue Day Pass";
      return { label: `${label} — ${fmtDur(overdueMs)}`, code };
    }
    return null;
  }, [campusStatus, effectiveEntryType, approvedPasses, normalizeReason]);

  // ── Render the 1 recommended + up to 2 alternatives ─────────────────────
  const renderRecommendation = () => {
    if (!recommendation) return null;

    const rec = recommendation;
    // The recommended button label: direction + reason/entryButton
    let recLabel: string;
    if (rec.direction === "IN" && rec.entryButton) {
      recLabel = buildDirectionLabel("IN", ENTRY_BUTTON_META[rec.entryButton].name);
    } else if (rec.direction === "OUT" && rec.reason) {
      const exitLabel = EXIT_REASON_LABELS[rec.reason] ?? rec.reason;
      recLabel = buildDirectionLabel("OUT", exitLabel);
    } else {
      recLabel = buildDirectionLabel(rec.direction, rec.direction === "IN" ? "Entry" : "Exit");
    }

    const DirIcon = operatorIcon(rec.direction === "IN" ? "in" : "out").icon;
    const recDisabled = !photoVerified || isFlagged;

    // If confidence < 0.7, show all alternatives (still max 2).
    const alts = rec.alternatives.slice(0, 2);

    return (
      <div className="space-y-3">
        {/* ONE big recommended button */}
        <button
          type="button"
          onClick={() => handleRecommendationConfirm(
            rec.direction,
            rec.reason ?? undefined,
            rec.entryType ?? undefined,
            rec.entryButton ?? undefined,
          )}
          disabled={recDisabled}
          className={cn(
            "w-full py-4 px-4 min-h-[56px] rounded-2xl border font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md",
            recDisabled
              ? "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
              : "bg-[var(--action-primary)] border-[var(--action-primary)] text-white hover:brightness-110",
          )}
        >
          <DirIcon className="w-5 h-5 shrink-0" />
          <span className="truncate">{recLabel}</span>
          {rec.confidence < 0.7 && (
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white">
              Low confidence
            </span>
          )}
        </button>

        {/* UP TO 2 smaller alternative buttons */}
        {alts.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {alts.map((alt) => {
              const AltIcon = operatorIcon(alt.icon).icon;
              const altLabel = alt.label;
              const altDisabled = !photoVerified || isFlagged;
              const altPayload = alt.payload;
              const buttonId: EntryButtonId | undefined = altPayload.buttonId as EntryButtonId | undefined;
              return (
                <button
                  key={alt.code}
                  type="button"
                  onClick={() => handleRecommendationConfirm(
                    altPayload.direction,
                    altPayload.reason ?? undefined,
                    altPayload.entryType ?? undefined,
                    buttonId,
                  )}
                  disabled={altDisabled}
                  className={cn(
                    "py-3 px-2 min-h-[44px] rounded-xl border font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    altDisabled
                      ? "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                      : "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] hover:border-emerald-500/50 hover:bg-[var(--bg-elevated)]",
                  )}
                >
                  <AltIcon className={cn("w-4 h-4", alt.direction === "IN" ? "text-emerald-400" : "text-amber-400")} />
                  <span>{altLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-lg relative space-y-5"
    >
      {/* Cancel Close Icon */}
      <button
        onClick={onCancel}
        aria-label="Cancel scan verification"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors border border-[var(--border)]"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Verification Status Banner */}
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-full w-fit mx-auto">
        {photoVerified ? (
          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Identity Verified</span>
          </span>
        ) : (
          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
            <Clock className="w-4 h-4" />
            <span>Verifying Identity... {countdown}s</span>
          </span>
        )}
      </div>

      {/* Live entry-type badge (top of card) */}
      {effectiveEntryType === "hosteller" ? (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <User className="w-3.5 h-3.5" />
            Hosteller
          </span>
        </div>
      ) : effectiveEntryType === "day_scholar" ? (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <User className="w-3.5 h-3.5" />
            Day Scholar
          </span>
        </div>
      ) : null}

      {/* Student Avatar & Basic Info */}
      <div className="text-center space-y-2">
        <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--border-strong)] shadow-md">
          {student.photo || student.photoUrl ? (
            <img src={student.photo || student.photoUrl} alt={student.fullName || student.name || "Person"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
              <User className="w-9 h-9 text-[var(--text-muted)]" />
            </div>
          )}
          {/* Photo verification overlay ring */}
          {!photoVerified && (
            <div className="absolute inset-0 rounded-2xl border-4 border-amber-400/60 animate-pulse" />
          )}
        </div>

        <div>
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{student.fullName || student.name}</h2>
            <PersonBadge type={student.personType || 'student'} />
          </div>
          <p className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">{student.uniqueId || student.roll}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {student.department || student.designation} {student.year && `- Year ${student.year}`}
          </p>

          {/* Live entry-type badge */}
          <div className="mt-2">
            {effectiveEntryType === "hosteller" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <User className="w-3 h-3" />
                Hosteller
              </span>
            ) : effectiveEntryType === "day_scholar" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <User className="w-3 h-3" />
                Day Scholar
              </span>
            ) : (
              campusStatus === "OUT" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)] border border-[var(--border)] bg-[var(--bg-base)]">
                  Select entry type below
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-amber-400 border border-amber-500/30 bg-amber-500/10">
                  Defaulting to Hosteller
                </span>
              )
            )}
          </div>
        </div>

        {/* Account Security Flagging & Alert Controls */}
        <div className="pt-2 flex flex-col items-center gap-2">
          {isFlagged && (
            <div className="w-full p-3 rounded-xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-300 text-center space-y-1 animate-pulse">
              <div className="flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider text-rose-400">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                SECURITY HOLD: ACCOUNT IS FLAGGED / BLOCKED
              </div>
              <p className="text-[10px] text-rose-200">
                This account is currently suspended or flagged suspicious. Gate movement is restricted.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleFlagAccount}
            disabled={flaggingLoading}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              isFlagged
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{isFlagged ? "UNFLAG / UNBLOCK ACCOUNT" : "FLAG THIS ACCOUNT / BLOCK ID"}</span>
          </button>
        </div>
      </div>

      {/* Active Permissions / Passes Section */}
      {(student.personType === "student" || !student.personType) && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl p-3.5 space-y-2 text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-muted)] block">
            Approved Exit Passes ({approvedPasses.length})
          </span>
          {loadingPasses ? (
            <p className="text-xs text-[var(--text-muted)] animate-pulse">Checking gate pass database...</p>
          ) : approvedPasses.length > 0 ? (
            <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
              {approvedPasses.map((pass) => (
                <div key={pass.id} className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-lg text-[11px]">
                  <div>
                    <span className="font-bold text-emerald-400">{pass.reason}</span>
                    <span className="text-[9px] text-[var(--text-muted)] ml-2">
                      until {new Date(pass.to_datetime).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-extrabold text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Approved
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] italic">No active approved exit passes found in database.</p>
          )}
        </div>
      )}

      {/* Current condition banner */}
      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl p-3 space-y-2 text-left">
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-muted)] block">
          Current Status
        </span>
        {campusStatus ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border",
                campusStatus === "IN"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30",
              )}
            >
              {campusStatus === "IN" ? (
                <LogIn className="w-3.5 h-3.5" />
              ) : (
                <Briefcase className="w-3.5 h-3.5" />
              )}
              {campusStatus === "IN" ? "Inside Campus" : "Outside Campus"}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {campusStatus === "IN"
                ? "Currently on campus — an exit can be recorded."
                : "Currently off campus — an entry can be recorded."}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border bg-slate-500/15 text-[var(--text-muted)] border-[var(--border)]">
              Unknown
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">
              No occupancy record yet. Choose entry or exit manually below.
            </span>
          </div>
        )}
      </div>

      {/* Overdue pass strip — amber, hosteller IN only */}
      {overdueInfo && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-3 py-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-400">{overdueInfo.label}</span>
        </div>
      )}

      {/* 1 Recommended + 2 Alternatives (auto-recommendation) */}
      <div className="space-y-3 pt-1">
        {renderRecommendation()}
      </div>

      <button
        onClick={onCancel}
        className="w-full text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 text-center"
      >
        Cancel & Resume Scanning
      </button>
    </motion.div>
  );

  if (isInline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="w-full flex justify-center"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pb-safe select-none overflow-hidden"
    >
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-y-contain rounded-3xl">
        {content}
      </div>
    </motion.div>
  );
}
