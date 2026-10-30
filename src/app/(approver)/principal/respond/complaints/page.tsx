"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

/**
 * /principal/respond/complaints — wraps ComplaintConsole for principal complaints queue.
 */
function RespondComplaintsPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Respond to Complaints</h1>
      <ComplaintConsole role="principal" basePath="/principal/respond/complaints" title="Principal Complaint Queue" />
    </div>
  );
}

export default function RespondComplaintsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <RespondComplaintsPageInner />
    </Suspense>
  );
}
