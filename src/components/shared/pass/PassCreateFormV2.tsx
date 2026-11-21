/**
 * shared/pass/PassCreateFormV2 — config-driven, persona-scoped pass create form.
 *
 * Replaces:
 *   student/PassCreateForm.tsx
 *   student/PermissionRequestForm.tsx
 *   approver/PermissionRequestForm.tsx
 *   parent/RequestPassForm.tsx
 *
 * Each caller passes a `mode` prop. The form reads the active
 * `PassTypeConfig` and renders only the fields that config requires.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Loader2,
  Clock,
  CheckCircle2,
  Ticket,
  Paperclip,
  MapPin,
  User,
  Building,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { usePassTypesV2 } from "@/hooks/usePassTypes";
import { usePersona } from "@/hooks/usePersona";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import type { PassTypeConfig } from "@/lib/pass-types";
import { ApprovalChainPreview } from "@/components/shared/pass/ApprovalChainPreview";
import { useUIStore } from "@/stores/uiStore";

// ── Props ─────────────────────────────────────────────────────────────────

export type PassFormMode = "student" | "parent" | "staff" | "direct";

export interface PassCreateFormV2Props {
  /** Who is filling this form. Changes which persona filter applies. */
  mode: PassFormMode;
  /** Override the persona (staff-on-behalf can act for either). */
  personaOverride?: import("@/lib/pass-types").Persona;
  /** Callback when the form is submitted successfully. */
  onCreated?: (passId: string) => void;
  /** Pre-select a pass type code. */
  initialCode?: string;
  className?: string;
}

// ── Duration helper ───────────────────────────────────────────────────────

function durationLabel(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h}h ${m}m`;
}

// ── Component ─────────────────────────────────────────────────────────────

export function PassCreateFormV2({
  mode,
  personaOverride,
  onCreated,
  initialCode,
  className,
}: PassCreateFormV2Props) {
  const persona = usePersona();
  const isSakuga = useIsSakuga();
  const { addToast } = useUIStore();
  const { configs, loading: loadingTypes } = usePassTypesV2({
    persona: personaOverride ?? persona,
    staffOnBehalf: mode === "staff" || mode === "direct",
  });

  // ── form state ──
  const [selectedCode, setSelectedCode] = useState<string>(initialCode ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [destination, setDestination] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected: PassTypeConfig | undefined = useMemo(
    () => configs.find((c) => c.code === selectedCode),
    [configs, selectedCode]
  );

  // Default selection
  const effectiveCode = selectedCode || configs[0]?.code || "";
  const effectiveConfig = selected || configs.find((c) => c.code === effectiveCode);

  // ── auto-fill to-time on from-change ──
  const handleFromChange = (v: string) => {
    setFrom(v);
    if (v && effectiveConfig) {
      const defaultHrs =
        effectiveConfig.durationUnit === "hours"
          ? effectiveConfig.maxDuration
          : effectiveConfig.maxDuration * 24;
      const end = new Date(v);
      end.setHours(end.getHours() + defaultHrs);
      setTo(toLocalInput(end));
    }
  };

  // ── duration preview ──
  const durationMs = useMemo(() => {
    if (!from || !to) return null;
    const ms = new Date(to).getTime() - new Date(from).getTime();
    return ms > 0 ? ms : null;
  }, [from, to]);

  // ── validate against config ──
  const validation = useMemo(() => {
    if (!effectiveConfig) return { valid: false, errors: [] as string[] };
    const errors: string[] = [];
    if (effectiveConfig.durationUnit === "hours" && durationMs != null) {
      if (durationMs < effectiveConfig.minDuration * 3_600_000)
        errors.push(`Min duration: ${effectiveConfig.minDuration}h`);
      if (durationMs > effectiveConfig.maxDuration * 3_600_000)
        errors.push(`Max duration: ${effectiveConfig.maxDuration}h`);
    }
    if (effectiveConfig.destinationRequired && !destination.trim())
      errors.push("Destination is required");
    if (effectiveConfig.guardianAddressRequired && !guardianAddress.trim())
      errors.push("Guardian address is required");
    if (effectiveConfig.attachmentRequired && !attachment)
      errors.push("Attachment is required");
    return { valid: errors.length === 0, errors };
  }, [effectiveConfig, durationMs, destination, guardianAddress, attachment]);

  // ── submit ──
  /**
   * @action "Submit the pass request" — validates the form, then POSTs
   * /api/permissions with the selected pass type + from/to window. On success
   * the ticket enters the approval chain (gated by the capability below); a
   * toast confirms "Submitted for approval."
   * @capability hostel.leave.apply
   */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveConfig || !from || !to) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowType: "hostel",
          passType: effectiveConfig.code,
          fromDateTime: new Date(from).toISOString(),
          toDateTime: new Date(to).toISOString(),
          destination: destination || undefined,
          guardianAddress: guardianAddress || undefined,
          reason: reason || undefined,
          // attachment upload handled by a separate /attachments call in Phase 2
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data?.id) {
        addToast({ variant: "success", title: "Pass requested", message: "Submitted for approval." });
        onCreated?.(body.data.id);
      } else {
        addToast({ variant: "error", title: "Submission failed", message: body?.error?.message ?? "Could not submit." });
      }
    } catch {
      addToast({ variant: "error", title: "Submission failed", message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ──
  return (
    <div className={cn("space-y-4", className)}>
      {/* Pass type selector */}
      {loadingTypes ? (
        <div className="flex items-center gap-2 text-sm text-text-muted py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pass types…
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-text-muted block mb-1.5">Pass type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {configs.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCode(c.code)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition",
                  effectiveCode === c.code
                    ? "border-action-primary bg-action-primary/10 text-text-primary"
                    : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-base"
                )}
              >
                <span className="font-semibold block">{c.label}</span>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  {c.durationUnit === "days"
                    ? `${c.minDuration}–${c.maxDuration} days`
                    : `${c.minDuration}–${c.maxDuration}h`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Config-driven fields */}
      {effectiveConfig && (
        <form onSubmit={submit} className="space-y-3">
          {/* Time range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-text-muted flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" /> From
              </label>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" /> To
              </label>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Duration preview */}
          {durationMs != null && (
            <div className="rounded-lg bg-bg-elevated border border-border px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" /> Duration
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  !validation.valid && validation.errors.some((e) => e.includes("Min") || e.includes("Max"))
                    ? "text-rose-500"
                    : "text-text-primary"
                )}
              >
                {durationLabel(durationMs)}
              </span>
            </div>
          )}

          {/* Destination */}
          {effectiveConfig.destinationRequired && (
            <div>
              <label className="text-xs font-medium text-text-muted flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Address or location"
                className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
              />
            </div>
          )}

          {/* Guardian address */}
          {effectiveConfig.guardianAddressRequired && (
            <div>
              <label className="text-xs font-medium text-text-muted flex items-center gap-1 mb-1">
                <User className="h-3 w-3" /> Guardian address
              </label>
              <input
                type="text"
                value={guardianAddress}
                onChange={(e) => setGuardianAddress(e.target.value)}
                placeholder="Where the student is going"
                className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
              />
            </div>
          )}

          {/* Attachment */}
          {effectiveConfig.attachmentRequired && (
            <div>
              <label className="text-xs font-medium text-text-muted flex items-center gap-1 mb-1">
                <Paperclip className="h-3 w-3" /> Attachment ({effectiveConfig.attachmentKinds.join(", ")})
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-text-muted file:mr-2 file:px-2 file:py-1 file:rounded file:border file:border-border file:text-text-secondary file:bg-bg-elevated"
              />
              {attachment && (
                <p className="text-[10px] text-action-success mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {attachment.name}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={2}
              className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none resize-none"
            />
          </div>

          {/* Approval chain preview */}
          <ApprovalChainPreview config={effectiveConfig} />

          {/* Validation errors */}
          {!validation.valid && validation.errors.length > 0 && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-600 space-y-0.5">
              {validation.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}

          {/* Submit */}
          {isSakuga ? (
            <sakuga-button
              type="submit"
              data-action="apply-pass"
              disabled={submitting || !validation.valid || !from || !to}
              className="w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              Submit {effectiveConfig.requiresApproval ? "for approval" : "pass"}
            </sakuga-button>
          ) : (
          <button
            type="submit"
            data-action="apply-pass"
            disabled={submitting || !validation.valid || !from || !to}
            className="w-full rounded-lg bg-action-primary px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="h-4 w-4" />
            )}
            Submit {effectiveConfig.requiresApproval ? "for approval" : "pass"}
          </button>
          )}
        </form>
      )}
    </div>
  );
}

export default PassCreateFormV2;

// ── Utility ───────────────────────────────────────────────────────────────

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
