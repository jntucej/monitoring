"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { InboxList } from "@/components/principal/inbox/InboxList";

/**
 * /principal/overdue — tickets that have breached SLA.
 */
function OverduePageInner() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <InboxList
        title="Overdue"
        description="Tickets that have breached their SLA deadline"
        fixedFilters={{ status: "PENDING", sla: "overdue" }}
      />
    </div>
  );
}

export default function OverduePage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <OverduePageInner />
    </Suspense>
  );
}
