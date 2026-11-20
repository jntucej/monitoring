/**
 * shared/complaints/EscalateComplaintButton.tsx — the "ESCALATE" step.
 * When a complaint breaches SLA (or the user wants it faster), escalate
 * via the LADDER (nextActor). Shows the SLA countdown + the escalate
 * button.
 */

"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";

export interface EscalateComplaintButtonProps {
  complaintId: string;
  /** The SLA deadline (ISO). When now > deadline, the complaint is breached. */
  slaDeadline?: string;
  /** Class name. */
  className?: string;
}

export function EscalateComplaintButton({
  complaintId,
  slaDeadline,
  className,
}: EscalateComplaintButtonProps) {
  const [escalating, setEscalating] = useState(false);
  const [done, setDone] = useState(false);

  const breach = slaDeadline ? Date.now() > new Date(slaDeadline).getTime() : false;

  const escalate = async () => {
    if (escalating || done) return;
    setEscalating(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/escalate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) setDone(true);
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {breach && !done && (
        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
          SLA breached
        </span>
      )}
      <button
        type="button"
        onClick={escalate}
        disabled={escalating || done}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          breach
            ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
            : "border-border text-text-secondary hover:bg-bg-elevated",
        )}
      >
        {escalating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          "Escalated ✓"
        ) : (
          <>
            <ArrowUpRight className="h-3.5 w-3.5" />
            Escalate
          </>
        )}
      </button>
    </div>
  );
}

export default EscalateComplaintButton;
