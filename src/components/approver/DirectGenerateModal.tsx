"use client";

import React, { useMemo, useState } from "react";
import { Lock, Zap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import { requiresStepup } from "@/lib/permission-workflow-pure";

type DirectGenReason = "home_out" | "day_pass" | "emergency" | "special_leave";

const DIRECT_GEN_REASONS: readonly DirectGenReason[] = [
  "home_out",
  "day_pass",
  "emergency",
  "special_leave",
];

const REASON_LABELS: Record<DirectGenReason, string> = {
  home_out: "Home Out",
  day_pass: "Day Pass",
  emergency: "Emergency",
  special_leave: "Special Leave",
};

export interface DirectGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The actor's current role (from the auth store). */
  actorRole: string;
  /** Fired after a pass is generated so the caller can refresh. */
  onGenerated?: () => void;
}

/**
 * Modal that generates a hostel pass directly, bypassing the staged chain.
 * L2+ approvers only (the button that opens this modal is already gated on
 * the caller's role; the server re-checks the same DIRECT_GENERATE_ROLES
 * list). Student lookup is by roll number or user id; reason and window are
 * validated server-side (duration limits, home_out being unlimited).
 */
export function DirectGenerateModal({
  isOpen,
  onClose,
  actorRole,
  onGenerated,
}: DirectGenerateModalProps) {
  const api = useApi();
  const addToast = useUIStore((s) => s.addToast);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentUserId, setStudentUserId] = useState("");
  const [studentName, setStudentName] = useState("");
  /** Live entry type of the looked-up student (drives the room-field gate). */
  const [studentEntryType, setStudentEntryType] = useState<"hosteller" | "day_scholar" | null>(null);
  const [reason, setReason] = useState<DirectGenReason>("home_out");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [stepupPassword, setStepupPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [looking, setLooking] = useState(false);
  // Room-assignment fields (day_scholar home_out flow).
  const [pendingHostelBlock, setPendingHostelBlock] = useState("");
  const [pendingRoomNumber, setPendingRoomNumber] = useState("");
  const [pendingWardenId, setPendingWardenId] = useState("");

  const reasonOptions: SelectOption[] = DIRECT_GEN_REASONS.map((r) => ({
    value: r,
    label: REASON_LABELS[r],
  }));

  // home_out needs no `to`; the server enforces this too.
  const toRequired = reason !== "home_out";

  // The three room-assignment fields are required only for a day_scholar
  // student requesting a home_out pass (the direct-generate route enforces the
  // same rule and rejects with HOSTEL_ROOM_REQUIRED when any is missing).
  const roomFieldsRequired = reason === "home_out" && studentEntryType === "day_scholar";

  const stepupRequired = useMemo(
    () => requiresStepup({ actorRole, action: "direct_generate", reason }),
    [actorRole, reason],
  );

  const lookupStudent = async () => {
    const q = studentQuery.trim();
    if (!q) {
      setError("Enter a roll number or user id to look up the student");
      return;
    }
    setLooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`, {
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (res.status === 403) {
        addToast({
          message: json.error?.message || "Your role may not list students; enter the user id directly.",
          variant: "error",
        });
        setLooking(false);
        return;
      }
      const rows: Array<{
        id?: string;
        uniqueId?: string;
        roll?: string;
        name?: string;
        student_details?: { roll?: string; current_entry_type?: "hosteller" | "day_scholar" | null } | null;
        studentDetails?: { roll?: string; currentEntryType?: "hosteller" | "day_scholar" | null } | null;
      }> | undefined = json.data;
      if (json.success && Array.isArray(rows) && rows.length > 0) {
        // Prefer a match whose roll or id equals the query.
        const norm = q.toUpperCase();
        const match =
          rows.find((r) => r.id === q || r.uniqueId === q) ??
          rows.find((r) => r.student_details?.roll?.toUpperCase() === norm) ??
          rows.find((r) => r.roll?.toUpperCase() === norm) ??
          rows[0];
        setStudentUserId(match.id || match.uniqueId || "");
        setStudentName(
          match.name || match.student_details?.roll || match.roll || q,
        );
        // Capture the live entry type so the room-field gate can apply. The
        // mPerson mapping exposes it camelCased on studentDetails.
        const entryType =
          match.studentDetails?.currentEntryType ??
          match.student_details?.current_entry_type ??
          null;
        setStudentEntryType(entryType);
      } else if (json.success && Array.isArray(rows) && rows.length === 0) {
        setError(`No student found for ${q}`);
      } else {
        setError(json.error?.message || "Student lookup failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLooking(false);
    }
  };

  const submit = async () => {
    if (!studentUserId) {
      setError("Look up the student first (roll number or user id)");
      return;
    }
    if (!from) {
      setError("From timestamp is required");
      return;
    }
    if (toRequired && !to) {
      setError("To timestamp is required for this reason");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/permissions/direct-generate", {
        method: "POST",
        headers: api.getHeaders(),
        body: JSON.stringify({
          studentUserId,
          reason,
          from,
          to: toRequired ? to : null,
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(stepupRequired ? { stepupPassword } : {}),
        }),
      });
      const json = await res.json();
      if (res.status === 403) {
        addToast({
          message: json.error?.message || "Step-up verification failed or you are locked out.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }
      if (json.success) {
        addToast({
          message: `Direct ${REASON_LABELS[reason]} pass generated for ${studentName || studentUserId}`,
          variant: "success",
        });
        onClose();
        if (onGenerated) onGenerated();
      } else {
        setError(json.error?.message || "Direct-generate was not accepted");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Pass (direct)" size="md">
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)]">
          Generate an approved pass directly, bypassing the staged chain.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
              Student (roll or user id)
            </label>
            <Input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Enter roll number or user id"
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" variant="secondary" onClick={lookupStudent} loading={looking} className="w-full">
              Look up
            </Button>
          </div>
        </div>

        {studentUserId && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{studentName || "Student"}</span>
            <span className="text-[var(--text-muted)] font-mono">({studentUserId})</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
              Reason
            </label>
            <Select
              options={reasonOptions}
              value={reason}
              onChange={(v) => setReason(v as DirectGenReason)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
              Note
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
              From
            </label>
            <Input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
              To {toRequired ? "" : "(optional for home out)"}
            </label>
            <Input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={!toRequired}
            />
          </div>
        </div>

        {stepupRequired && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Step-up password required
            </div>
            <Input
              type="password"
              value={stepupPassword}
              onChange={(e) => setStepupPassword(e.target.value)}
              placeholder="Enter your approval password"
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} loading={submitting} disabled={submitting}>
            <Zap className="w-3.5 h-3.5 mr-1" />
            Generate Pass
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DirectGenerateModal;
