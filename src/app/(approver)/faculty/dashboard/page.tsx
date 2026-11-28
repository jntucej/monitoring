"use client";

/**
 * /faculty/dashboard — the catalog-driven Faculty OS hub.
 * All institutional rules come from /api/config/catalog + /api/faculty/state.
 */
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { FacultyDashboardShell } from "@/components/faculty/FacultyDashboardShell";

export default function FacultyDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <FacultyDashboardShell />
    </Suspense>
  );
}
