"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { HostelCurfew } from "@/components/principal/hostels/HostelCurfew";
import { HostelActivityFeed } from "@/components/principal/hostels/HostelActivityFeed";

function HostelCurfewPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Hostel Curfew & Returns</h1>
      <HostelCurfew />
      <HostelActivityFeed />
    </div>
  );
}

export default function HostelCurfewPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <HostelCurfewPageInner />
    </Suspense>
  );
}
