"use client";

/**
 * /sysadmin/governance — Module 3: HOD / OIE / Principal governance console.
 * Role-guarded by the sysadmin layout (sysadmin / admin / oie / principal only).
 */
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { GovernanceConsole } from "@/components/sysadmin/GovernanceConsole";

export default function GovernanceConsolePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <GovernanceConsole />
    </Suspense>
  );
}
