"use client";

/**
 * /hod/dashboard — the catalog-driven HOD OS hub.
 * All institutional rules come from /api/config/catalog (hodOsPolicy) +
 * /api/hod/os/state (live DB). No hardcoded thresholds in this page.
 */
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { HodOsShell } from "@/components/hod/HodOsShell";

export default function HodOsDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HodOsShell />
    </Suspense>
  );
}
