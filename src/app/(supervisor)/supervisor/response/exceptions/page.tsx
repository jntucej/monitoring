"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { EscalationsView } from "../../_shared/EscalationsView";

export default function ExceptionsPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Audit policy deviations, pass mismatch warnings, and transit exception logs"
        contextLabel="Policy Exceptions Queue"
        statusSummary="Review automated access rejections, suspicious repeat scans, and perimeter policy exceptions."
        why="Auditing automated access rejections prevents pass tampering, tailgating, and repeated expired-pass attempts."
        severity="warn"
        primaryAction={{ label: "Escalations Queue", href: "/supervisor/response/escalations" }}
        secondaryAction={{ label: "Security Incidents", href: "/supervisor/response/incidents" }}
      />
      <EscalationsView />
    </div>
  );
}
