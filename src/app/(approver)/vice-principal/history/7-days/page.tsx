"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { HistoryView } from "../../_shared/HistoryView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Weekly operational review of recent approver decisions, delegations, and clearances"
        why="Reviewing weekly determinations ensures recent complex cases were resolved in full accordance with campus guidelines."
        contextLabel="Weekly Decision Audit"
        statusSummary="Review approval actions and policy decisions executed during the previous 7 days."
        primaryAction={{ label: "Last 30 Days", href: "/vice-principal/history/30-days" }}
        secondaryAction={{ label: "Decision History", href: "/vice-principal/decision-history" }}
      />
      <HistoryView days={7} title="History · Last 7 days" />
    </div>
  );
}
