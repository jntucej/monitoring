/**
 * sysadmin/ConductPolicies — admin-editable CoC policy viewer.
 *
 * Reads COC_POLICIES from lib/conduct.ts (server-side constant in Phase 5;
 * migrates to a DB table in Phase 6). Renders each policy with its
 * domain, appliesTo flags, and action type.
 */

"use client";

import { Shield, AlertTriangle, CheckCircle2, XCircle, Forward } from "lucide-react";
import { cn } from "@/lib/utils";
import { COC_POLICIES, type CoCPolicy } from "@/lib/conduct";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

const ACTION_ICONS: Record<CoCPolicy["action"], React.ReactNode> = {
  block: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
  require_stepup: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  require_dual: <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />,
  notify_supervisor: <Forward className="h-3.5 w-3.5 text-sky-500" />,
};

const ACTION_LABELS: Record<CoCPolicy["action"], string> = {
  block: "Blocks action",
  require_stepup: "Requires step-up auth",
  require_dual: "Requires co-sign",
  notify_supervisor: "Notifies supervisor",
};

export function ConductPolicies({ className }: { className?: string }) {
  return (
    <WidgetBoundary name="coc-policies">
      <div className={cn("rounded-xl border border-border bg-bg-elevated p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Code of Conduct Policies</h3>
          <span className="ml-auto text-[10px] text-text-muted">{COC_POLICIES.length} active</span>
        </div>

        <div className="space-y-2">
          {COC_POLICIES.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-bg-base px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                {ACTION_ICONS[p.action]}
                <span className="text-xs font-semibold text-text-primary">{p.rule}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
                <span>Domain: <strong className="text-text-secondary">{p.domain}</strong></span>
                <span>Flags: <strong className="text-text-secondary">{p.appliesTo.join(", ")}</strong></span>
                <span className="ml-auto">
                  <span
                    className={cn(
                    "rounded-full px-1.5 py-0.5 font-semibold uppercase",
                    p.action === "block" && "bg-rose-500/10 text-rose-500",
                    p.action === "require_stepup" && "bg-amber-500/10 text-amber-500",
                    p.action === "require_dual" && "bg-orange-500/10 text-orange-500",
                    p.action === "notify_supervisor" && "bg-sky-500/10 text-sky-500"
                  )}
                  >
                    {ACTION_LABELS[p.action]}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-text-muted">
          Policies are defined in <code className="text-text-secondary">lib/conduct.ts</code>.
          Admin edits migrate to a DB table in a later phase.
        </p>
      </div>
    </WidgetBoundary>
  );
}

export default ConductPolicies;
