/**
 * shared/pass/ApprovalChainPreview — renders the ordered approval chain
 * with per-node ETA labels and parent-consent indicator.
 *
 * Driven entirely by PassTypeConfig — no hardcoded node names.
 */

"use client";

import { ShieldCheck, User, Clock, ArrowRight } from "lucide-react";
import type { PassTypeConfig } from "@/lib/pass-types";
import { approvalChainLabel, ROLE_LABELS, type ApprovalRole } from "@/lib/pass-types";
import { cn } from "@/lib/utils";

export interface ApprovalChainPreviewProps {
  config: PassTypeConfig;
  /** If the pass is currently pending, highlight the active node index. */
  activeNodeIndex?: number;
  /** Override per-node ETA labels (e.g. from live approver response times). */
  etas?: Partial<Record<ApprovalRole, string>>;
  className?: string;
}

export function ApprovalChainPreview({
  config,
  activeNodeIndex = -1,
  etas,
  className,
}: ApprovalChainPreviewProps) {
  const chain = config.approvalChain;

  if (chain.length === 0) return null;

  // If requiresApproval is false, show a single "Self" node
  const nodes: ApprovalRole[] = config.requiresApproval ? chain : ["self"];

  return (
    <div className={cn("rounded-xl border border-border bg-bg-elevated p-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2.5 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Approval chain
      </p>

      {/* Chain nodes */}
      <div className="flex flex-wrap items-center gap-1.5">
        {nodes.map((role, i) => {
          const isActive = i === activeNodeIndex;
          const isSelf = role === "self";
          const eta = etas?.[role];

          return (
            <div key={role} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium border space-y-0.5",
                  isActive
                    ? "bg-action-primary/15 border-action-primary/40 text-action-primary"
                    : isSelf
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                      : "bg-bg-base border-border text-text-secondary"
                )}
              >
                <div className="flex items-center gap-1">
                  {isSelf ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <ShieldCheck className="h-3 w-3" />
                  )}
                  <span>{ROLE_LABELS[role] ?? role}</span>
                  {isActive && <Clock className="h-3 w-3 animate-pulse" />}
                </div>
                {eta && (
                  <p className={cn("text-[10px]", isActive ? "text-action-primary/80" : "text-text-muted")}>
                    {eta}
                  </p>
                )}
              </div>

              {i < nodes.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Parent consent indicator */}
      {config.requiresParentConsent && (
        <div className="mt-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px] text-amber-700">
          <span className="font-semibold">Parent consent required</span>
          {config.parentConsentExpiryHours > 0 && (
            <span className="ml-1">
              (expires in {config.parentConsentExpiryHours}h)
            </span>
          )}
        </div>
      )}

      {/* Quota indicator */}
      {config.quotaLimit != null && config.quotaKey && (
        <p className="mt-2 text-[10px] text-text-muted">
          Quota: {config.quotaLimit} {config.quotaWindow ?? "period"}
          {config.quotaOverrideTier === 1 && " (warden can override)"}
        </p>
      )}

      {/* Chain label (compact text version for small screens) */}
      <p className="mt-2 text-[10px] text-text-muted">
        {approvalChainLabel(nodes)}
      </p>
    </div>
  );
}

export default ApprovalChainPreview;
