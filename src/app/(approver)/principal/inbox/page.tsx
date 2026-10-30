"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { InboxList } from "@/components/principal/inbox/InboxList";
import { InboxFilters } from "@/components/principal/inbox/InboxFilters";

/**
 * /principal/inbox — the main inbox: all pending tickets at the principal stage.
 */
function InboxPageInner() {
  return (
    <div className="space-y-4 px-4 sm:px-6 py-6">
      <InboxFilters />
      <InboxList
        title="Inbox"
        description="All pending tickets at your stage"
        fixedFilters={{ status: "PENDING" }}
      />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <InboxPageInner />
    </Suspense>
  );
}
