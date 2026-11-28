"use client";

/**
 * /admin/steward — ADMIN Office Steward Studio: Fee Slabs & Regulation Drafts /
 * Annual Rollover Staging / Scope Boundaries & Static Map.
 * Catalog-driven, zero-hardcoded, live-DB.
 */
import { Suspense } from "react";
import { AdminStewardShell } from "@/components/admin/AdminStewardShell";
import { PageLoading } from "@/components/shared/LoadingStates";

export default function AdminStewardStudioPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminStewardShell view="steward" />
    </Suspense>
  );
}
