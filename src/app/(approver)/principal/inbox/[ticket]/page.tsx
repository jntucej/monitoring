"use client";

import { Suspense, use } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { InboxDetailSheet } from "@/components/principal/inbox/InboxDetailSheet";

/**
 * /principal/inbox/[ticket] — thin wrapper over the detail panel.
 * On load, opens the detail sheet for the given ticket.
 */
function TicketDetailInner({ ticket }: { ticket: string }) {
  return (
    <div className="px-4 sm:px-6 py-6">
      <InboxDetailSheet ticket={ticket} onClose={() => window.history.back()} />
    </div>
  );
}

interface PageProps {
  params: Promise<{ ticket: string }>;
}

export default function InboxTicketPage(props: PageProps) {
  const { ticket } = use(props.params);
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <TicketDetailInner ticket={ticket} />
    </Suspense>
  );
}
