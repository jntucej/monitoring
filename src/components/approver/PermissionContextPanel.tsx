"use client";

/**
 * PermissionContextPanel — right-hand detail panel for the HOD console.
 *
 * Wraps PermissionDetailPanel so a selected BoardRow (ticket_number in
 * row.id) opens a side panel on desktop and a bottom-sheet overlay on
 * mobile, matching the operator ContextPanel layout.
 */

import { X, ShieldCheck } from "lucide-react";
import { BoardRow } from "@/components/shared/Board";
import { PermissionDetailPanel } from "./PermissionDetailPanel";
import type { WorkflowType } from "@/lib/types";

export interface PermissionContextPanelProps {
  row: BoardRow | null;
  onClose: () => void;
  onActionComplete?: () => void;
}

function statusBadgeClass(status?: string) {
  if (status === "PENDING") return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  if (status === "APPROVED") return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  if (status === "REJECTED") return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
  return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
}

export function PermissionContextPanel({ row, onClose, onActionComplete }: PermissionContextPanelProps) {
  if (!row) return null;

  const ticket = row.id;
  // BoardRow does not carry status/workflow_type, so the status badge comes
  // from the workflow type hint on the row. The full detail (student, stage,
  // biometrics, actions) is rendered by PermissionDetailPanel below.
  const workflowType = (row.person_type as WorkflowType | null) ?? null;

  const header = (
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)]/95 backdrop-blur-md z-10">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold font-mono text-[var(--action-primary)] truncate">{ticket}</h3>
          {workflowType ? (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusBadgeClass(workflowType)}`}>
              {workflowType}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5 inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          {row.name || row.roll || "HOD permission"}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors shrink-0"
        aria-label="Close permission panel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const body = (
    <>
      {header}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <PermissionDetailPanel
          ticket={ticket}
          onClose={onClose}
          onActionComplete={onActionComplete}
          isStandalonePage={false}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop side panel */}
      <aside
        aria-label="Permission detail panel"
        className="hidden md:flex flex-col w-[340px] lg:w-[380px] shrink-0 bg-[var(--bg-surface)] border-l border-[var(--border)] overflow-y-auto custom-scrollbar"
      >
        {body}
      </aside>

      {/* Mobile bottom-sheet overlay */}
      <div
        className="md:hidden fixed inset-0 z-40 flex flex-col bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-2xl max-h-[85dvh] overflow-hidden shadow-2xl"
        style={{ bottom: 0, left: 0, right: 0 }}
        aria-label="Permission detail panel (mobile)"
      >
        <div className="flex-1 overflow-y-auto">
          {body}
        </div>
      </div>
    </>
  );
}
