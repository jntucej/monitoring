"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { InboxList } from "@/components/principal/inbox/InboxList";

/**
 * /principal/delegated — tickets delegated to sub-roles (vice-principal, HOD, etc).
 */
function DelegatedPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <InboxList
        title="Delegated"
        description="Tickets in delegated authority"
        fixedFilters={{ status: "PENDING" }}
      />
    </div>
  );
}

export default function DelegatedPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <DelegatedPageInner />
    </Suspense>
  );
}
