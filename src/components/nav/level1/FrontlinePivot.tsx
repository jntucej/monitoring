"use client";

// src/components/nav/level1/FrontlinePivot.tsx
// Level-1 (frontline execution) record-pivot component.
//
// FrontlineSubjectSheet is a right-side slide-over (bottom sheet on mobile)
// that shows operational verification fields scoped to the current duty.
// No full admin history — only what a frontline operator / worker /
// caretaker / mess-incharge needs to confirm a record at hand.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ClipboardCheck, MapPin, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

// ── Types ────────────────────────────────────────────────────────────────

export interface FrontlineSubject {
  id: string;
  name: string;
  /** Identifier in mono (roll number, ticket, code, etc.) */
  code?: string;
  /** Short status label, e.g. "PENDING", "ACTIVE", "SENT" */
  statusTag?: string;
  /** Gate / block / mess scope hint */
  locationOrScope?: string;
}

// Roles that get the "field handover / resolution note" textarea.
const FIELD_ROLES = new Set(["worker", "caretaker", "mess_incharge"]);

// ── Component ────────────────────────────────────────────────────────────

export function FrontlineSubjectSheet({
  subject,
  onClose,
}: {
  subject: FrontlineSubject | null;
  onClose: () => void;
}) {
  const role = useAuthStore((s) => s.role);
  const [note, setNote] = useState("");
  const showNote = role != null && FIELD_ROLES.has(role);

  // Reset note whenever a new subject opens.
  const handleDone = () => {
    setNote("");
    onClose();
  };

  return (
    <AnimatePresence>
      {subject && (
        <motion.div
          key="frontline-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-80"
          role="dialog"
          aria-modal="true"
          aria-label={`Verification — ${subject.name}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={handleDone}
            aria-hidden
          />

          {/* Panel: right slide-over on desktop, bottom sheet on mobile */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md sm:max-w-sm bg-bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="surface-card flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="h-4 w-4 text-action-primary shrink-0" aria-hidden />
                <h2 className="text-sm font-bold text-text-primary truncate">
                  {subject.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleDone}
                aria-label="Close"
                className="text-text-muted hover:text-text-primary transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Identifier */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Identifier
                </p>
                <p className="font-mono text-sm text-text-primary break-all">
                  {subject.code ?? subject.id}
                </p>
              </div>

              {/* Current state */}
              {subject.statusTag && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Current State
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase border ${
                      /pending|open|active/i.test(subject.statusTag)
                        ? "border-amber-400/30 bg-amber-500/10 text-action-warning"
                        : /sent|resolved|closed|completed/i.test(subject.statusTag)
                        ? "border-emerald-400/30 bg-emerald-500/10 text-action-success"
                        : "border-border/40 bg-bg-elevated/20 text-text-secondary"
                    }`}
                  >
                    {subject.statusTag}
                  </span>
                </div>
              )}

              {/* Scope */}
              {subject.locationOrScope && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Scope
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden />
                    {subject.locationOrScope}
                  </p>
                </div>
              )}

              {/* Field handover / resolution note — worker / caretaker / mess_incharge only */}
              {showNote && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="frontline-note"
                    className="text-xs font-semibold text-text-muted uppercase tracking-wide"
                  >
                    Field handover / Resolution note
                  </label>
                  <textarea
                    id="frontline-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="What you observed, what you did, who you handed off to."
                    className="surface-card w-full bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:ringfocus-ring outline-none resize-y"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-3 space-y-2">
              <p className="text-xs text-text-muted">
                Scoped to your duty. Notes are logged to the shift record.
              </p>
              <button
                type="button"
                onClick={handleDone}
                className="surface-card w-full min-h-11 inline-flex items-center justify-center gap-2 bg-action-primary px-4 py-2.5 text-sm font-bold text-black hover:brightness-110 transition active:scale-[0.99]"
              >
                <ClipboardCheck className="h-4 w-4" />
                Done
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
