"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { InboxList } from "@/components/principal/inbox/InboxList";

/**
 * /principal/escalated — tickets escalated to the principal by lower-stage approvers.
 */
function EscalatedPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <InboxList
        title="Escalated"
        description="Tickets escalated beyond their stage, requiring principal intervention"
        fixedFilters={{ status: "PENDING" }}
      />
    </div>
  );
}

export default function EscalatedPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <EscalatedPageInner />
    </Suspense>
  );
}
