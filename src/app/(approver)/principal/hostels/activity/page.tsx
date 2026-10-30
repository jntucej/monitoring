"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { HostelActivityFeed } from "@/components/principal/hostels/HostelActivityFeed";
import { HostelOverview } from "@/components/principal/hostels/HostelOverview";

function HostelActivityPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Hostel Activity</h1>
      <HostelActivityFeed />
      <HostelOverview />
    </div>
  );
}

export default function HostelActivityPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <HostelActivityPageInner />
    </Suspense>
  );
}
