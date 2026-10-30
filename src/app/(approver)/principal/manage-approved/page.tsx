"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { InboxList } from "@/components/principal/inbox/InboxList";

/**
 * /principal/manage-approved — already-approved tickets for management and revocation.
 */
function ManageApprovedPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <InboxList
        title="Manage Approved"
        description="Approved tickets — review, revoke, or manage pass lifecycle"
        fixedFilters={{ status: "APPROVED" }}
      />
    </div>
  );
}

export default function ManageApprovedPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <ManageApprovedPageInner />
    </Suspense>
  );
}
