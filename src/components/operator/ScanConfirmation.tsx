"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { User, CheckCircle2, LogIn, Home, Sun, Clock, X, Briefcase, ShieldAlert, Flag } from "lucide-react";
import { ExitReason, StudentType, Student, ScanDirection, ExitReasonConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { useAuthStore } from "@/stores/authStore";
import { useCampusConfig } from "@/hooks/useCampusConfig";

interface ScanConfirmationProps {
  student: Student;
  onConfirm: (direction: ScanDirection, reason?: ExitReason) => void | Promise<void>;
  onCancel: () => void;
  suggestedDirection?: ScanDirection;
  /** Authoritative current IN/OUT condition of the scanned person. */
  campusStatus?: "IN" | "OUT" | null;
  isInline?: boolean;
}

type ActionEntry = {
  code: ExitReason;
  name: string;
  direction: ScanDirection;
  icon: React.ElementType;
  applicableTo: StudentType[];
  requiresApproval: boolean;
  parentNotification: boolean | string;
};

const reasonIcons: Record<string, React.ElementType> = {
  "Regular": Briefcase,
  "Home Out": Home,
  "Day Out": Sun,
  "Leave": Clock,
  "Daily Outing": Briefcase,
  "Day Pass": Sun,
  "Home In": Home,
  "daily_outing": Briefcase,
  "home_in": Home,
  "home_out": Home,
  "day_pass": Sun,
  "Outing": Briefcase,
  "Emergency": Clock,
};

export function ScanConfirmation({
  student,
  onConfirm,
  onCancel,
  suggestedDirection = "IN",
  campusStatus = null,
  isInline = false,
}: ScanConfirmationProps) {
  const { exitReasons } = useCampusConfig();
  const validExitReasons = exitReasons.length > 0 ? exitReasons : [];

  // Fallback OUT options so the operator always has a path even when the
  // campus exit-reason config fails to load (empty array) or returns no
  // reasons applicable to this student. Mirrors the canonical exit-flow
  // codes in src/lib/student-exit-flow.ts.
  const FALLBACK_EXIT_REASONS: ExitReasonConfig[] = [
    {
      code: "daily_outing",
      name: "Daily Outing",
      description: "Standard local daily outing (no pass required)",
      applicableTo: ["HM", "HF", "DM", "DF"],
      requiresApproval: false,
      parentNotification: "silent",
    },
    {
      code: "home_out",
      name: "Home Out",
      description: "Weekend/overnight leave (requires principal-approved pass)",
      applicableTo: ["HM", "HF"],
      requiresApproval: true,
      approvalBy: "principal",
      parentNotification: "sms",
    },
    {
      code: "day_pass",
      name: "Day Pass",
      description: "Full day leave (requires principal-approved pass)",
      applicableTo: ["DM", "DF"],
      requiresApproval: true,
      approvalBy: "principal",
      parentNotification: "sms",
    },
  ];
  
  // Photo verification state
  const [photoVerified, setPhotoVerified] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [selectedDirection, setSelectedDirection] = useState<ScanDirection | null>(null);
  const [selectedReason, setSelectedReason] = useState<ExitReason | null>(null);
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

  // The config's `applicableTo` is a person-type (e.g. "student"), but
  // `student.studentType` is a sub-category (HM/HF/DM/DF). A reason that
  // applies to "student" therefore applies to every student sub-type.
  const studentAppliesTo = (cfg: ExitReasonConfig) => {
    if (!student.studentType) return true;
    const applicable = cfg.applicableTo as string[];
    if (applicable.includes(student.studentType)) return true;
    if (applicable.includes("student")) return true;
    return false;
  };

  const baseExitReasons = (student.personType && student.personType !== "student")
    ? [validExitReasons.find((cfg) => cfg.code === "Regular") || validExitReasons[0]].filter(Boolean)
    : validExitReasons.filter(studentAppliesTo);

  // If the live config produced no usable options (config fetch failed, or
  // none apply to this student), fall back to the canonical exit reasons so
  // the operator is never left with an empty OUT section.
  const applicableReasons = baseExitReasons.length > 0
    ? baseExitReasons
    : FALLBACK_EXIT_REASONS.filter(studentAppliesTo);

  const outActions: ActionEntry[] = applicableReasons.map((config) => ({
    ...config,
    name: student.personType && student.personType !== "student" ? "Exit" : config.name,
    direction: "OUT" as ScanDirection,
    icon: reasonIcons[config.code] || Briefcase,
  }));

  // Entry (IN) options. Only two reasons exist for coming in:
  //   - Daily Outing: day scholars entering for the day (24h window).
  //     Also permitted for hostelers doing a short day trip out.
  //   - Home In: return to campus from a home visit.
  // IN never requires a gate pass (server returns early on direction "IN").
  const inActions: ActionEntry[] = [
    {
      code: "daily_outing",
      name: "Daily Outing",
      direction: "IN",
      icon: Sun,
      applicableTo: ["HM", "HF", "DM", "DF"],
      requiresApproval: false,
      parentNotification: false,
    },
    {
      code: "home_in",
      name: "Home In",
      direction: "IN",
      icon: Home,
      applicableTo: ["HM", "HF", "DM", "DF"],
      requiresApproval: false,
      parentNotification: false,
    },
  ];

  const handleConfirmClick = async (direction: ScanDirection, reason?: ExitReason) => {
    if (!photoVerified || isFlagged) {
      return;
    }
    setSelectedDirection(direction);
    setSelectedReason(reason || null);
    await onConfirm(direction, reason);
  };

  // Map a reason value (canonical code or legacy/label form) to a stable
  // token so pass-reason matching is consistent across the config, the
  // passed reason, and the canonical exit-flow codes.
  const normalizeReason = (r?: string) => {
    if (!r) return "";
    const s = r.trim().toLowerCase().replace(/[\s_-]+/g, "");
    // Canonical exit-flow codes (src/lib/student-exit-flow.ts)
    if (s === "dailyouting" || s === "outing" || s === "dayout") return "daily_outing";
    if (s === "homein") return "home_in";
    if (s === "homeout" || s === "leave") return "home_out";
    if (s === "daypass") return "day_pass";
    if (s === "emergency") return "daily_outing";
    if (s === "regular") return "regular";
    return s;
  };

  const renderActionButtons = (actions: ActionEntry[]) => (
    <div className={cn("grid gap-2", actions.length > 2 ? "grid-cols-3" : "grid-cols-2")}>
      {actions.map(({ code, name, icon: Icon, direction, requiresApproval }) => {
        const isSelected = selectedDirection === direction && selectedReason === code;
        const passRequired = direction === "OUT" && requiresApproval;
        const hasApprovedPass = approvedPasses.some((p) => {
          if (!p.reason) return false;
          if (p.reason === code || p.reason === name) return true;
          if (p.reason.toLowerCase() === code.toLowerCase() || p.reason.toLowerCase() === name.toLowerCase()) return true;
          return normalizeReason(p.reason) === normalizeReason(code) || normalizeReason(p.reason) === normalizeReason(name);
        });
        const isDisabled = !photoVerified || isFlagged || (passRequired && !hasApprovedPass);
        return (
          <button
            key={`${direction}-${code}`}
            type="button"
            onClick={() => handleConfirmClick(direction, code)}
            disabled={isDisabled}
            className={cn(
              "py-3 px-2 min-h-[44px] rounded-xl border font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
              isSelected
                ? "bg-[var(--action-primary)] border-[var(--action-primary)] text-white"
                : photoVerified && !isDisabled
                  ? "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] hover:border-emerald-500/50 hover:bg-[var(--bg-elevated)]"
                  : "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                isSelected ? "text-white" : direction === "IN" ? "text-emerald-400" : "text-amber-400"
              )}
            />
            <span>{name}</span>
            {passRequired && (
              <span className={cn(
                "text-[8px] font-extrabold mt-1 px-1 rounded border scale-90",
                hasApprovedPass 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-rose-500/20 text-rose-400 border-rose-500/30"
              )}>
                {hasApprovedPass ? "Pass Active" : "No Pass"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

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

      {/* Current condition banner: shows the scanned person's live IN/OUT status
          and which operations are available, before the operator picks an action */}
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
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
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

      {/* Action Movement Category Selection */}
      <div className="space-y-4 pt-1">
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] block text-center mb-2">
            Confirm Entry
            {suggestedDirection === "IN" && (
              <span className="ml-2 inline-block text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 align-middle">
                Suggested
              </span>
            )}
          </label>
          {renderActionButtons(inActions)}
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] block text-center mb-2">
            Confirm Exit
            {suggestedDirection === "OUT" && (
              <span className="ml-2 inline-block text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 align-middle">
                Suggested
              </span>
            )}
          </label>
          {renderActionButtons(outActions)}
        </div>
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
