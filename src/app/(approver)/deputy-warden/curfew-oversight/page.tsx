"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { Clock } from "lucide-react";

export default function DeputyWardenCurfewOversightPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Curfew Oversight</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Monitor hostel curfew compliance, overnight gate movement, and late-return requests.
        </p>
      </div>
      <ContextSituationBar
        contextLabel="Hostel Curfew Monitoring"
        summary="Review live curfew status, check overnight gate scans, or process pending leave requests."
        primaryAction={{ label: "Live Curfew Status", href: "/deputy-warden/curfew" }}
        secondaryAction={{ label: "Gate Movement", href: "/deputy-warden/gate-movement" }}
      />
      <EmptyState
        icon={<Clock className="size-6" />}
        title="Curfew Oversight"
        description="Use Live Curfew Status or Gate Movement above to inspect resident presence and late entries."
      />
    </div>
  );
}
