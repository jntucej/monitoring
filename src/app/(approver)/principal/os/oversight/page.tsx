"use client";

/**
 * /principal/oversight — Audited Telemetry, Emergency & 8-Year Archival.
 * Three-tab console: Audited Campus Map & Emergency Control · 8-Year Retention
 * & NAAC/NBA Ledger · Immutable Audit Trail. Catalog-driven, zero-hardcoded.
 */
import { Suspense } from "react";
import { PrincipalOsShell } from "@/components/principal/PrincipalOsShell";
import { PageLoading } from "@/components/shared/LoadingStates";

export default function PrincipalOversightPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PrincipalOsShell view="oversight" />
    </Suspense>
  );
}
