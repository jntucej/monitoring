/**
 * shared/profile/MyDisputesPanel.tsx — every open dispute across all
 * features (attendance, event, meal, pass, document, complaint). This is
 * the ESCALATE step of the Profile Records loop: "my disputes" in one
 * place. Reuses useDisputes.
 */

"use client";

import { ShieldAlert, CheckCircle2, Clock, Loader2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisputes, type Dispute } from "@/hooks/useDisputes";

export interface MyDisputesPanelProps {
  /** Only show open disputes (default true). */
  openOnly?: boolean;
  /** Max rows (default 10). */
  limit?: number;
  className?: string;
}

/** Map an entity_type to its owner deep-link. */
const ENTITY_LINK: Record<string, { label: string; href: string }> = {
  attendance: { label: "Attendance", href: "/student/attendance" },
  event: { label: "Event", href: "/student/my-events" },
  meal: { label: "Meal", href: "/student/mess" },
  pass: { label: "Pass", href: "/student/passes" },
  document: { label: "Document", href: "/student/passes" },
  complaint: { label: "Complaint", href: "/student/complaints" },
};

function statusMeta(s: Dispute["status"]) {
  switch (s) {
    case "open":
      return { label: "Open", accent: "text-amber-400", Icon: Clock };
    case "reviewed":
      return { label: "In review", accent: "text-blue-400", Icon: Clock };
    case "resolved":
      return { label: "Resolved", accent: "text-green-400", Icon: CheckCircle2 };
    case "rejected":
      return { label: "Rejected", accent: "text-red-400", Icon: CheckCircle2 };
    default:
      return { label: s, accent: "text-text-muted", Icon: Clock };
  }
}

export function MyDisputesPanel({ openOnly = true, limit = 10, className }: MyDisputesPanelProps) {
  const { disputes, loading } = useDisputes(openOnly ? "open" : undefined);
  const rows = disputes.slice(0, limit);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 py-3 text-xs text-text-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading disputes…
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-action-primary" />
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          My disputes {openOnly && `(${rows.length} open)`}
        </h3>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-text-muted">No open disputes. If something was marked wrong, raise one from the feature page.</p>
      )}

      {rows.map((d) => {
        const link = ENTITY_LINK[d.entity_type] ?? { label: d.entity_type, href: "/student" };
        const meta = statusMeta(d.status);
        const Icon = meta.Icon;
        return (
          <div key={d.id} className="surface-card p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.accent)} />
                <span className="text-xs font-medium text-text capitalize">{d.entity_type}</span>
                <span className={cn("text-[11px]", meta.accent)}>{meta.label}</span>
              </div>
              <a
                href={link.href}
                className="flex items-center gap-0.5 text-[11px] text-action-primary/80 hover:text-action-primary shrink-0"
              >
                {link.label}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            {d.reason && <p className="text-[11px] text-text-muted">{d.reason}</p>}
            <p className="text-[10px] text-text-muted/70">
              {new Date(d.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              {d.escalated_to ? ` · escalated to ${d.escalated_to}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default MyDisputesPanel;
