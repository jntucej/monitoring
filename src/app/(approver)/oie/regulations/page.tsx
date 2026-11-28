"use client";

/**
 * /oie/regulations — OIE Regulation Drafting, Equivalency & Rollover Staging.
 * 3-tab studio (Regulation Cloning & Fee Slabs / Subject Equivalency Maps /
 * Annual Rollover Staging). OIE is the Steward: drafts + lints + dry-runs,
 * never solo-publishes (routes to Principal quorum).
 */
import { Suspense, useState } from "react";
import { OieShell } from "@/components/oie/OieShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { OieHarnessPill, OieHarnessDrawer } from "@/components/oie/OieHarnessDrawer";

export default function OieRegulationsPage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <OieShell view="regulations" />
      <OieHarnessPill onOpen={() => setHarnessOpen(true)} />
      <OieHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
