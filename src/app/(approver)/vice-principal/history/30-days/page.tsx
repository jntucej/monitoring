"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { HistoryView } from "../../_shared/HistoryView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Audit trail of decisions, approvals, and executive determinations over the last 30 days"
        why="A monthly audit window reveals medium-term decision patterns, approval distribution, and potential policy pain points."
        contextLabel="Monthly Decision History"
        statusSummary="Examine 30-day institutional approval metrics, turnaround rates, and audit logs."
        primaryAction={{ label: "Last 7 Days", href: "/vice-principal/history/7-days" }}
        secondaryAction={{ label: "Last 90 Days", href: "/vice-principal/history/90-days" }}
      />
      <HistoryView days={30} title="History · Last 30 days" />
    </div>
  );
}
