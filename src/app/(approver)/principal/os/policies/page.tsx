"use client";

/**
 * /principal/policies — Policy Studio & Annual Rollover.
 * Three-tab studio: Versioned Policies & Regulation Cloning · 1-Click Annual
 * Rollover Wizard · Governance Matrix (Meta-Rule Locked). Catalog-driven,
 * zero-hardcoded.
 */
import { Suspense } from "react";
import { PrincipalOsShell } from "@/components/principal/PrincipalOsShell";
import { PageLoading } from "@/components/shared/LoadingStates";

export default function PrincipalPoliciesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PrincipalOsShell view="policies" />
    </Suspense>
  );
}
