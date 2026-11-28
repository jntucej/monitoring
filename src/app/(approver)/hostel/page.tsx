"use client";

/**
 * /hostel — Gate Passes, Curfew Watches & Biometric Feed.
 * KPI strip + 3-tab operations (5-step pass queue / curfew watches /
 * H0201 biometric feed). Catalog-driven, zero-hardcoded, live-DB.
 */
import { Suspense, useState } from "react";
import { HostelShell } from "@/components/hostel/HostelShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { HostelHarnessPill, HostelHarnessDrawer } from "@/components/hostel/HostelHarnessDrawer";

export default function HostelGatePage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <HostelShell view="gate" />
      <HostelHarnessPill onOpen={() => setHarnessOpen(true)} />
      <HostelHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
