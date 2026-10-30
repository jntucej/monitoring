"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

/**
 * /principal/respond/emergency — emergency decisions page.
 * Wraps ComplaintConsole for emergency complaints; falls back to empty state
 * if no emergency complaints exist.
 */
function EmergencyPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Emergency Decisions</h1>
      <ComplaintConsole
        role="principal"
        basePath="/principal/respond/emergency"
        title="Emergency Complaints"
      />
    </div>
  );
}

export default function EmergencyPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <EmergencyPageInner />
    </Suspense>
  );
}
