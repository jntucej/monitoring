"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import VpExaminationPage from "../examination-coordination/page";
export { WeekBar } from "../_shared/WeekBar";

export default function VpExaminationsPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Institutional examination governance, clearance coordination, and SLA monitoring"
        contextLabel="Examination Governance"
        statusSummary="Monitor exam clearance requests, address hall ticket bottlenecks, and track exam SLA status."
        primaryAction={{ label: "Exam Coordination", href: "/vice-principal/examination-coordination" }}
        secondaryAction={{ label: "Pending Approvals", href: "/vice-principal/pending-approvals" }}
      />
      <VpExaminationPage />
    </div>
  );
}

