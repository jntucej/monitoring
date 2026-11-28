"use client";

/**
 * /oie/exam-ops — OIE Exam Ops, Hall Ticket Gate & Results.
 * KPI strip + 3-tab operations (Hall Ticket Gate / Registrations & RC-RV /
 * CIE Locks & Results). Catalog-driven, zero-hardcoded, live-DB.
 */
import { Suspense, useState } from "react";
import { OieShell } from "@/components/oie/OieShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { OieHarnessPill, OieHarnessDrawer } from "@/components/oie/OieHarnessDrawer";

export default function OieExamOpsPage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <OieShell view="exam-ops" />
      <OieHarnessPill onOpen={() => setHarnessOpen(true)} />
      <OieHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
