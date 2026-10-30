"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { HostelOverview } from "@/components/principal/hostels/HostelOverview";
import { HostelCurfew } from "@/components/principal/hostels/HostelCurfew";
import { HostelComplaintList } from "@/components/principal/hostels/HostelComplaintList";
import { HostelActivityFeed } from "@/components/principal/hostels/HostelActivityFeed";

function HostelOverviewPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Hostel Overview</h1>
      <HostelOverview />
      <HostelCurfew />
      <HostelComplaintList />
      <HostelActivityFeed />
    </div>
  );
}

export default function HostelOverviewPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <HostelOverviewPageInner />
    </Suspense>
  );
}
