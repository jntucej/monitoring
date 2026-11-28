"use client";

/**
 * /hostel/bridge-and-telemetry — Hostel Bridge, Circulars & Gate Telemetry.
 * 3-tab console (Bridge & Anti-Ragging / Circulars & Recall / Gate &
 * Perimeter Telemetry). Privacy: static topology + 30m-cutoff counter only.
 */
import { Suspense, useState } from "react";
import { HostelShell } from "@/components/hostel/HostelShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { HostelHarnessPill, HostelHarnessDrawer } from "@/components/hostel/HostelHarnessDrawer";

export default function HostelBridgePage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <HostelShell view="bridge" />
      <HostelHarnessPill onOpen={() => setHarnessOpen(true)} />
      <HostelHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
