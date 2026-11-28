"use client";

/**
 * /sysadmin/security-and-topology — 1-Click Topology, Dynamic RBAC &
 * Quorum Co-Sign. 3-tab console (Topology / RBAC + Quorum / Hardware &
 * Network telemetry). Immutable Meta-Rule enforced in the API.
 */
import { Suspense, useState } from "react";
import { SysadminShell } from "@/components/sysadmin/SysadminShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { SysadminHarnessPill, SysadminHarnessDrawer } from "@/components/sysadmin/SysadminHarnessDrawer";

export default function SysadminSecurityTopologyPage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <SysadminShell view="security" />
      <SysadminHarnessPill onOpen={() => setHarnessOpen(true)} />
      <SysadminHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
