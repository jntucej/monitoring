"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { HistoryView } from "../../_shared/HistoryView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Quarterly institutional governance audit and historical request analytics"
        contextLabel="Quarterly Decision Archive"
        statusSummary="Access long-term compliance records and approval trails spanning the past 90 days."
        primaryAction={{ label: "Last 30 Days", href: "/vice-principal/history/30-days" }}
        secondaryAction={{ label: "Delegated Responsibilities", href: "/vice-principal/delegated-responsibilities" }}
      />
      <HistoryView days={90} title="History · Last 90 days" />
    </div>
  );
}
