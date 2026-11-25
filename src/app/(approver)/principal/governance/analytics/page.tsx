"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { AnalyticsView } from "../../_shared/AnalyticsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Long-term governance analytics tracking institutional compliance, approval latencies, and campus trends"
        why="Monitoring long-term approval trends and compliance rates highlights operational bottlenecks across academic departments."
        contextLabel="Institutional Governance Analytics"
        statusSummary="Monitor longitudinal institutional performance metrics, policy effectiveness, and operational throughput."
        primaryAction={{ label: "Governance Reports", href: "/principal/governance/reports" }}
        secondaryAction={{ label: "Audit Ledger", href: "/principal/governance/audit" }}
      />
      <AnalyticsView />
    </div>
  );
}
