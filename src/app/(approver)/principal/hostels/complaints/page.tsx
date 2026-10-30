"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { HostelComplaintList } from "@/components/principal/hostels/HostelComplaintList";

function HostelComplaintsPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Hostel Complaints</h1>
      <HostelComplaintList />
    </div>
  );
}

export default function HostelComplaintsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <HostelComplaintsPageInner />
    </Suspense>
  );
}
