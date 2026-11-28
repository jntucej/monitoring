"use client";

/**
 * /oie/bridge — OIE Protected Escalations, Circulars & Adapters.
 * 3-tab console (Protected Escalations & Grievances / Exam Circulars & Recall /
 * Adapters & Static Hall Map). Privacy: static hall-block topology only —
 * zero live GPS / geofence / biometric reader state.
 */
import { Suspense, useState } from "react";
import { OieShell } from "@/components/oie/OieShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { OieHarnessPill, OieHarnessDrawer } from "@/components/oie/OieHarnessDrawer";

export default function OieBridgePage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <OieShell view="bridge" />
      <OieHarnessPill onOpen={() => setHarnessOpen(true)} />
      <OieHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
