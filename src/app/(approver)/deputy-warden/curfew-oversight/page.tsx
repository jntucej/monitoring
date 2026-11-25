"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";

export default function DeputyWardenCurfewOversightPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Curfew Oversight</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Monitor hostel curfew compliance, overnight gate movement, and late-return requests.
        </p>
      </div>
      <ContextSituationBar
        roleLabel="Deputy Warden"
        purpose="Monitor hostel curfew compliance, overnight gate movement, and late-return requests"
        why="Monitoring curfew hours catches late entries and unauthorized overnight absences to maintain resident safety."
        contextLabel="Hostel Curfew Monitoring"
        statusSummary="Review live curfew status, check overnight gate scans, or process pending leave requests."
        severity="info"
        primaryAction={{ label: "Live Curfew Status", href: "/deputy-warden/curfew" }}
        secondaryActions={[
          { label: "Gate Movement", href: "/deputy-warden/gate-movement" },
          { label: "Daily Overview", href: "/deputy-warden/daily-overview" },
        ]}
      />
      <ApproverDecisionQueue
        roleLabel="Deputy Warden"
        forwardLabel="Forward to Hostel Manager"
        relatedHref="/deputy-warden/leave-requests"
        relatedLabel="Leave Requests"
      />
    </div>
  );
}
