"use client";

/**
 * /sysadmin/adapters-and-runtime — Adapters, runtime_profiles & Form Registry.
 * 3-tab studio (integration_adapters / runtime_profiles & hardware knobs /
 * program blueprints + zero-deploy form schemas).
 */
import { Suspense, useState } from "react";
import { SysadminShell } from "@/components/sysadmin/SysadminShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { SysadminHarnessPill, SysadminHarnessDrawer } from "@/components/sysadmin/SysadminHarnessDrawer";

export default function SysadminAdaptersRuntimePage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <SysadminShell view="adapters" />
      <SysadminHarnessPill onOpen={() => setHarnessOpen(true)} />
      <SysadminHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
