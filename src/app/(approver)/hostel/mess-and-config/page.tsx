"use client";

/**
 * /hostel/mess-and-config — Mess Rebates, Billing & facilities.config Studio.
 * 3-tab studio (Mess Rebate Queue / Billing Ledger / facilities.config
 * Steward Studio). Chief Warden drafts; VP/Principal activates.
 */
import { Suspense, useState } from "react";
import { HostelShell } from "@/components/hostel/HostelShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { HostelHarnessPill, HostelHarnessDrawer } from "@/components/hostel/HostelHarnessDrawer";

export default function HostelMessConfigPage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <HostelShell view="mess" />
      <HostelHarnessPill onOpen={() => setHarnessOpen(true)} />
      <HostelHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
