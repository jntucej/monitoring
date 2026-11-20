/**
 * shared/events/EventDisputeForm.tsx — "I was there" dispute for events.
 * Step 7 of the event loop: the user attended but wasn't marked. Uploads
 * proof (selfie, photo, friend confirm) and routes to the organizer via
 * the universal dispute API.
 */

"use client";

import { useState } from "react";
import { Send, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisputes } from "@/hooks/useDisputes";

export interface EventDisputeFormProps {
  eventId: string;
  /** Called after the dispute is created. */
  onSubmitted?: () => void;
  className?: string;
}

export function EventDisputeForm({ eventId, onSubmitted, className }: EventDisputeFormProps) {
  const { create } = useDisputes();
  const [reason, setReason] = useState("I attended but was not marked present.");
  const [proofType, setProofType] = useState<"selfie" | "photo" | "friend">("selfie");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (submitting || !reason.trim()) return;
    setSubmitting(true);
    const dispute = await create({
      entity_type: "event",
      entity_id: eventId,
      reason: reason.trim(),
      evidence: { proof_type: proofType, proof_note: proofNote.trim() || undefined },
    });
    setSubmitting(false);
    if (dispute) {
      setSubmitted(true);
      onSubmitted?.();
    }
  };

  if (submitted) {
    return (
      <div className={cn("rounded-lg bg-green-500/10 px-4 py-3 text-xs text-green-400", className)}>
        ✓ Dispute submitted. The organizer will review within 48h. Track it in
        <a href="/student/profile" className="underline"> My Disputes</a>.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold text-text-muted">I was there — dispute</p>

      {/* Proof type */}
      <div className="flex gap-1.5">
        {(["selfie", "photo", "friend"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setProofType(t)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] capitalize transition-colors",
              proofType === t
                ? "border-action-primary bg-action-primary/10 text-action-primary"
                : "border-border text-text-muted",
            )}
          >
            {t === "selfie" ? "Selfie" : t === "photo" ? "Photo" : "Friend confirm"}
          </button>
        ))}
      </div>

      {/* Reason */}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="What happened? (e.g. I was at the venue but not scanned)"
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted/50"
      />

      {/* Proof note */}
      <input
        value={proofNote}
        onChange={(e) => setProofNote(e.target.value)}
        placeholder="Optional: who was with you / where exactly"
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted/50"
      />

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !reason.trim()}
        className="flex items-center gap-2 rounded-lg bg-action-primary px-4 py-2 text-xs font-medium text-bg hover:bg-action-primary/90 disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        {submitting ? "Submitting…" : "Submit dispute"}
      </button>
    </div>
  );
}

export default EventDisputeForm;
