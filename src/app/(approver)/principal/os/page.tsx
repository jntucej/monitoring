"use client";

/**
 * /principal — Executive Command & Unified Sign-Offs.
 * The Principal (Data Owner / CAC Chair) command surface: KPI strip + the
 * three-tab unified sign-off queue. Catalog-driven, zero-hardcoded.
 */
import { Suspense } from "react";
import { PrincipalOsShell } from "@/components/principal/PrincipalOsShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { PrincipalHarnessPill, PrincipalHarnessDrawer } from "@/components/principal/PrincipalHarnessDrawer";
import { useState } from "react";

export default function PrincipalCommandPage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <PrincipalOsShell view="command" />
      <PrincipalHarnessPill onOpen={() => setHarnessOpen(true)} />
      <PrincipalHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
