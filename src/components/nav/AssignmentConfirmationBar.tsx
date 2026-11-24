"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import { getActionsForRole, type RoleActionDef } from "@/lib/role-action-engine";

export interface AssignmentRecord {
  id: string;
  title: string;
  subjectCode?: string;
  dueDate?: string | null;
  confirmedByCr?: boolean;
  verifiedByFaculty?: boolean;
}

export function AssignmentConfirmationBar({
  assignment,
  role,
  onAction,
}: {
  assignment: AssignmentRecord;
  role: string | undefined;
  onAction: (action: RoleActionDef, note?: string) => Promise<void> | void;
}) {
  const actions = getActionsForRole(role, {
    kind: "assignment",
    recordId: assignment.id,
  });
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const trigger = async (act: RoleActionDef) => {
    if (act.requiresNote && !showNote && !note.trim()) {
      setShowNote(true);
      return;
    }
    setBusyId(act.id);
    try {
      await onAction(act, note.trim() || undefined);
      setNote("");
      setShowNote(false);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      data-testid={`assignment-confirm-${assignment.id}`}
      className="surface-card bg-bg-surface p-3.5 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">{assignment.title}</p>
          <p className="text-xs text-text-muted">
            {assignment.subjectCode ? `${assignment.subjectCode} · ` : ""}
            {assignment.dueDate ? `Due ${assignment.dueDate}` : "Active assignment"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 font-medium ${
              assignment.confirmedByCr
                ? "bg-action-success/10 text-action-success"
                : "text-text-muted"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            CR: {assignment.confirmedByCr ? "Confirmed" : "Pending"}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 font-medium ${
              assignment.verifiedByFaculty
                ? "bg-action-success/10 text-action-success"
                : "text-text-muted"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Faculty: {assignment.verifiedByFaculty ? "Verified" : "Pending"}
          </span>
        </div>
      </div>

      {showNote && (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-action-warning shrink-0" />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add confirmation or class blocker note..."
            className="w-full rounded-lg border border-border bg-bg-base px-2.5 py-1.5 text-xs text-text-primary"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        {actions.map((act) => {
          if (act.tone === "link" && act.href) {
            return (
              <Link
                key={act.id}
                href={act.href}
                className="inline-flex items-center gap-1 border border-border px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-elevated"
              >
                <span>{act.label}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            );
          }

          const cls =
            act.tone === "primary"
              ? "bg-action-primary text-white hover:brightness-110"
              : "border border-border bg-bg-base text-text-primary hover:bg-bg-elevated";

          return (
            <button
              key={act.id}
              type="button"
              disabled={busyId !== null}
              onClick={() => trigger(act)}
              className={`px-2.5 py-1 text-xs font-medium transition-opacity disabled:opacity-50 ${cls}`}
            >
              <span>{busyId === act.id ? "Working..." : act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
