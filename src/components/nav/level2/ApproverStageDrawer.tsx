"use client";

// src/components/nav/level2/ApproverStageDrawer.tsx
// Level-2 (departmental / hostel / exam-branch) record-pivot component.
//
// ApproverStageDrawer is a right-slide-over (bottom sheet on mobile)
// that shows:
//   Tab 1 – "Approval Chain": the full stage chain with the current
//            stage highlighted.
//   Tab 2 – "Student & Scope Context": linked student / candidate
//            plus a scope note.
//
// The footer links to the full ticket page (/permissions/<id>)
// for actions and a Close button.
//
// Complements the existing EntityInspector / EntityInspectorPanel
// without replacing it.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  X,
  GitBranch,
  User,
  ExternalLink,
  Circle,
  ChevronRight,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { type Role } from "@/lib/types";
import {
  resolvePermissionAbility,
  type ViewerContext,
  makeViewer,
} from "@/lib/record-abilities";
import { PassTicketTierView } from "../PassTicketTierView";
import { PivotStrip } from "@/components/shared/PivotStrip";

// ── Types ────────────────────────────────────────────────────────────────

export interface StagePivotItem {
  ticketId: string;
  ticketNumber: string;
  workflowType: string;
  currentStage: string;
  status: string;
  studentId?: string;
  studentName?: string;
  studentRoll?: string;
  /**
   * Full ordered list of stage names for the chain.
   * The component highlights `currentStage` and marks
   * earlier stages as completed.
   * If not provided, a minimal [currentStage] chain is shown.
   */
  stages?: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

type Tab = "chain" | "context" | "tier";

function statusToneCls(status: string): string {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return "border-emerald-400/30 bg-emerald-400/10 text-action-success";
  if (s === "REJECTED" || s === "CANCELLED")
    return "border-rose-400/30 bg-rose-400/10 text-action-danger";
  if (s === "ESCALATED" || s === "PENDING")
    return "border-amber-400/30 bg-amber-400/10 text-action-warning";
  return "border-border/30 bg-bg-elevated/10 text-text-muted";
}

// ── Component ────────────────────────────────────────────────────────────

export function ApproverStageDrawer({
  item,
  onClose,
}: {
  item: StagePivotItem | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("chain");
  const prevFocus = useRef<HTMLElement | null>(null);

  // Lock body scroll + Esc-to-close + focus restoration when drawer is open
  useEffect(() => {
    if (!item) return;

    // Save trigger focus for restoration on close
    prevFocus.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      // Only fire when not typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
      // Restore focus to the trigger element
      prevFocus.current?.focus?.();
    };
  }, [item, onClose]);

  // ── Role-ability layer: what THIS viewer can do on THIS record ──────
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role) as Role | undefined;
  const viewer: ViewerContext = makeViewer(role, {
    userId: user?.id ?? "",
    departmentId: user?.departmentId ?? null,
    hostelScope: user?.studentDetails?.hostelBlock ?? null,
    assignedGateId: user?.gateId ?? null,
  });
  const ability = item
    ? resolvePermissionAbility(
        {
          id: item.ticketId,
          ticket_number: item.ticketNumber,
          workflow_type: item.workflowType,
          current_stage: item.currentStage,
          status: item.status,
          student_user_id: item.studentId,
        },
        viewer,
      )
    : null;

  // Pass-ticket tier rules (richer section-aware view)
  const tierTicket = item
    ? {
        id: item.ticketId,
        ticketNumber: item.ticketNumber,
        workflowType: item.workflowType,
        status: item.status,
        currentStage: item.currentStage,
        studentId: item.studentId,
        studentName: item.studentName,
        studentRoll: item.studentRoll,
      }
    : null;

  const handleSelectTab = (t: Tab) => {
    setTab(t);
  };

  // (We keep it simple — the parent controls when `item` is null vs set.)

  // Derive the stage list.
  const stages: string[] =
    item?.stages && item.stages.length > 0
      ? item.stages
      : item
        ? [item.currentStage]
        : [];

  const currentIdx = stages.indexOf(item?.currentStage ?? "");

  // Render stage pill
  const renderStagePill = (stage: string, idx: number) => {
    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;
    const cls = isCurrent
      ? "border-action-primary bg-action-primary/10 text-action-primary ring-1 ring-action-primary/30"
      : isPast
        ? "border-emerald-400/30 bg-emerald-400/10 text-action-success"
        : "border-border bg-bg-elevated/20 text-text-muted";

    return (
      <div
        key={stage}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${cls}`}
      >
        {isCurrent ? (
          <Circle className="h-3.5 w-3.5 fill-current" aria-hidden />
        ) : isPast ? (
          <Circle className="h-3.5 w-3.5 text-action-success" aria-hidden />
        ) : (
          <Circle className="h-3.5 w-3.5 text-text-muted" aria-hidden />
        )}
        <span className="truncate">{stage.replace(/_/g, " ")}</span>
        {idx < stages.length - 1 && (
          <ChevronRight
            className="h-3 w-3 text-text-muted shrink-0 ml-auto"
            aria-hidden
          />
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="approver-stage-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-80"
          role="dialog"
          aria-modal="true"
          aria-label={`Stage chain — ${item.ticketNumber}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full sm:max-w-lg md:max-w-xl bg-bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header — Zone 1: Identity, Live State, Role Lens */}
            <div
              data-role-tier="tier-2"
              data-event-mode={ability?.mode ?? "observe"}
              data-testid="inspector-drawer"
              className="surface-card flex items-center justify-between px-4 py-3 border-b border-border"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch
                  className="h-4 w-4 text-action-primary shrink-0"
                  aria-hidden
                />
                <h2 className="text-sm font-bold text-text-primary truncate">
                  {item.ticketNumber}
                </h2>
                {/* Live State Pill: compound "STATUS @ STAGE" */}
                <span
                  data-testid="live-state-pill"
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${statusToneCls(item.status)}`}
                >
                  {item.status}
                  {item.currentStage
                    ? ` @ ${item.currentStage.replace(/_/g, " ").toUpperCase()}`
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Full Page CTA — hidden for self-loop / kiosk roles */}
                {!["student", "guardian", "parent", "operator", "caretaker", "worker", "mess_incharge"].includes(String(role ?? "").toLowerCase()) && (
                  <Link
                    href={`/permissions/${item.ticketId}`}
                    data-testid="full-page-cta"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-action-primary text-white text-xs font-semibold hover:brightness-110 transition active:scale-[0.98]"
                  >
                    Full Page
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-text-muted hover:text-text-primary transition-colors p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Role Lens Banner — "why I'm here" */}
            {ability && (
              <div
                data-testid="role-lens-banner"
                className="px-4 py-2 bg-bg-elevated/40 border-b border-border/50"
              >
                <p className="text-xs text-text-secondary leading-relaxed">
                  {ability.roleReason}
                </p>
              </div>
            )}

            {/* Sub-header: workflow type */}
            <div className="px-4 py-2 text-xs text-text-muted border-b border-border/50">
              <span className="font-mono uppercase tracking-wide">
                {item.workflowType.replace(/_/g, " ")}
              </span>
            </div>

            {/* Tab bar */}
            <div
              className="flex border-b border-border"
              role="tablist"
              aria-label="Drawer tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "chain"}
                onClick={() => handleSelectTab("chain")}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  tab === "chain"
                    ? "border-action-primary text-text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                Approval Chain
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "context"}
                onClick={() => handleSelectTab("context")}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  tab === "context"
                    ? "border-action-primary text-text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                Student &amp; Scope Context
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "tier"}
                onClick={() => handleSelectTab("tier")}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  tab === "tier"
                    ? "border-action-primary text-text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                Role View
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {tab === "chain" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Stage Chain ({stages.length} stages)
                  </p>
                  <div className="space-y-1.5">
                    {stages.map((stage, idx) => renderStagePill(stage, idx))}
                  </div>
                  <p className="text-xs text-text-muted">
                    {currentIdx === -1
                      ? `Current stage "${item.currentStage.replace(/_/g, " ")}" is not in the known chain.`
                      : `Currently at stage ${currentIdx + 1} of ${stages.length}.`}
                  </p>
                </div>
              )}

              {tab === "context" && (
                <div className="space-y-4">
                  {/* Linked student / candidate */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      Linked Student
                    </p>
                    {item.studentName || item.studentRoll ? (
                      <div className="surface-card bg-bg-elevated/30 rounded-lg p-3 flex items-center gap-3">
                        <div className="flex items-center justify-center h-9 w-9 rounded-full bg-bg-elevated shrink-0">
                          <User
                            className="h-4.5 w-4.5 text-text-secondary"
                            aria-hidden
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {item.studentName ?? "—"}
                          </p>
                          {item.studentRoll && (
                            <p className="font-mono text-xs text-text-muted">
                              Roll / ID: {item.studentRoll}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">
                        No linked student data available for this ticket.
                      </p>
                    )}
                  </div>

                  {/* Scope note */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      Scope Note
                    </p>
                    <div className="surface-card bg-bg-elevated/30 rounded-lg p-3 text-xs text-text-secondary space-y-1">
                      <p>
                        Workflow:{" "}
                        <span className="font-mono text-text-primary">
                          {item.workflowType.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p>
                        Current stage:{" "}
                        <span className="font-mono text-text-primary">
                          {item.currentStage.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="text-text-muted">
                        This ticket is scoped to your approval tier. Full
                        context, stage history, and actions are available on
                        the full ticket page.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Role-ability section: WHY this viewer is here + their turn */}
            {ability && ability.actions.length > 0 && (
              <div data-testid="action-bar" className="border-t border-border/60 px-4 py-3 space-y-2.5 bg-bg-elevated/30">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-action-primary shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Your role here · {ability.mode}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {ability.roleReason}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ability.actions.map((action) =>
                    action.href ? (
                      <Link
                        key={action.id}
                        data-testid={`action-${action.id}`}
                        href={action.href}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          action.intent === "primary"
                            ? "bg-action-primary text-white hover:brightness-110"
                            : action.intent === "danger"
                              ? "bg-rose-500/15 text-action-danger hover:bg-rose-500/25"
                              : "surface-card bg-bg-elevated text-text-primary hover:bg-bg-surface"
                        }`}
                      >
                        <span>{action.label}</span>
                      </Link>
                    ) : (
                      <Link
                        key={action.id}
                        href={`/permissions/${item!.ticketId}`}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          action.intent === "primary"
                            ? "bg-action-primary text-white hover:brightness-110"
                            : action.intent === "danger"
                              ? "bg-rose-500/15 text-action-danger hover:bg-rose-500/25"
                              : "surface-card bg-bg-elevated text-text-primary hover:bg-bg-surface"
                        }`}
                      >
                        <span>{action.label}</span>
                        {action.disabledReason && (
                          <span className="ml-1 text-[10px] opacity-70">
                            ({action.disabledReason})
                          </span>
                        )}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            )}

              {tab === "tier" && tierTicket && (
                <div className="pb-2 space-y-3">
                  {/* Zone 3: Relational Pivot Strip */}
                  <PivotStrip
                    pivots={[
                      ...(item.studentRoll
                        ? [{
                            kind: "student",
                            id: item.studentId ?? item.studentRoll,
                            label: item.studentName
                              ? `Student: ${item.studentName}`
                              : item.studentRoll,
                            sublabel: item.studentRoll,
                          }]
                        : []),
                    ]}
                  />
                  <PassTicketTierView
                    role={role ?? undefined}
                    ticket={tierTicket}
                    currentPath=""
                  />
                </div>
              )}

            {/* Footer */}
            <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2.5">
              <div className="flex items-center gap-2">
                <Link
                  href={`/permissions/${item.ticketId}`}
                  className="surface-card flex-1 min-h-11 inline-flex items-center justify-center gap-2 bg-action-primary px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-[0.99]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Full Ticket &amp; Actions
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="surface-card min-h-11 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-text-secondary bg-bg-elevated hover:bg-bg-surface transition"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-text-muted">
                Stage data reflects the current chain state. Actions are
                handled on the full ticket page.
              </p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ApproverStageDrawer;
