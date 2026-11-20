/**
 * admin/FlagManager — admin UI for setting / clearing user conduct flags.
 *
 * Shown in the admin user management panel. Selects a user, picks a
 * flag level, writes to /api/conduct/flags/:userId/set (or /clear).
 * The audit log records who set/cleared the flag and why.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Shield, Loader2, CheckCircle2, XCircle, FileSearch,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { FlagBadge } from "@/components/shared/FlagBadge";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import type { FlagLevel } from "@/lib/permission-model";

const FLAG_OPTIONS: Array<{ value: FlagLevel; label: string; description: string }> = [
  { value: "clear", label: "Clear", description: "No active flag" },
  { value: "watch", label: "Watch", description: "1 minor violation in 30d — step-up required" },
  { value: "probation", label: "Probation", description: "2+ violations or serious single — dual approval" },
  { value: "suspended", label: "Suspended", description: "Active investigation — cannot act on tickets" },
  { value: "banned", label: "Banned", description: "Confirmed violation — fully blocked" },
];

export interface FlagManagerProps {
  /** The user to manage flags for. */
  userId: string;
  userName?: string;
  className?: string;
}

export function FlagManager({ userId, userName, className }: FlagManagerProps) {
  const { addToast } = useUIStore();
  const [currentFlag, setCurrentFlag] = useState<FlagLevel>("clear");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current flag state.
  useEffect(() => {
    fetch(`/api/conduct/flags/${encodeURIComponent(userId)}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.data?.currentFlag) setCurrentFlag(b.data.currentFlag as FlagLevel);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const setFlag = async (flag: FlagLevel) => {
    if (flag === currentFlag) return;
    if (flag !== "clear" && !reason.trim()) {
      addToast({ variant: "warning", title: "Reason required", message: "Provide a reason before setting a flag." });
      return;
    }
    setSubmitting(true);
    try {
      const url = flag === "clear"
        ? `/api/conduct/flags/${encodeURIComponent(userId)}/clear`
        : `/api/conduct/flags/${encodeURIComponent(userId)}/set`;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          flag,
          reason: reason.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setCurrentFlag(flag);
        setReason("");
        addToast({
          variant: "success",
          title: flag === "clear" ? "Flag cleared" : `Flag set to ${flag}`,
          message: userName ? `${userName} is now ${flag === "clear" ? "clear" : "on " + flag}.` : "Flag updated.",
        });
      } else {
        addToast({ variant: "error", title: "Failed", message: body?.error?.message ?? "Could not update flag." });
      }
    } catch {
      addToast({ variant: "error", title: "Failed", message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WidgetBoundary name="flag-manager">
      <div className={cn("rounded-xl border border-border bg-bg-elevated p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Flag Manager</h3>
          {userName && <span className="text-xs text-text-muted ml-1">{userName}</span>}
        </div>

        {loading ? (
          <p className="text-xs text-text-muted flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading flag state…
          </p>
        ) : (
          <>
            {/* Current flag */}
            <div className="flex items-center gap-2">
              <FlagBadge flag={currentFlag} />
              <span className="text-xs text-text-muted">
                {currentFlag === "clear" ? "No active flag" : `Currently on ${currentFlag}`}
              </span>
            </div>

            {/* Flag options */}
            <div className="grid grid-cols-2 gap-1.5">
              {FLAG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => void setFlag(opt.value)}
                  disabled={submitting || opt.value === currentFlag}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-xs transition disabled:opacity-40",
                    currentFlag === opt.value
                      ? "border-action-primary bg-action-primary/10"
                      : "border-border bg-bg-base hover:bg-bg-elevated"
                  )}
                >
                  <p className="font-semibold text-text-primary">{opt.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{opt.description}</p>
                </button>
              ))}
            </div>

            {/* Reason (required for non-clear) */}
            {currentFlag !== "clear" || reason ? (
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">
                  Reason {currentFlag !== "clear" && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. 2 late returns in 30 days"
                  className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Required when setting a flag"
                  className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none"
                />
              </div>
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default FlagManager;
