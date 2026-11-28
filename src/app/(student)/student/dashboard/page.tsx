"use client";

/**
 * /student/dashboard — the catalog-driven Student OS hub.
 *
 * Renders the StudentDashboardShell: hero KPI strip (Hall Ticket Gate,
 * attendance buffer, next deadline, dues), context-pinned pass QR,
 * What-If attendance simulator, schema-driven action drawers, and the
 * Authority Bridge feed.
 *
 * All institutional rules come from /api/config/catalog + /api/student/state —
 * zero hardcoded thresholds, forms, or tab lists.
 */
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { StudentDashboardShell } from "@/components/student/StudentDashboardShell";

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentDashboardShell />
    </Suspense>
  );
}
