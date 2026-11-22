"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";

const StudentFeesPage = lazy(() => import("@/components/student/StudentFeesPage"));

export default function FeesPage() {
  return (
    <SakugaPageShell>
      <Suspense fallback={null}>
        <StudentFeesPage />
      </Suspense>
    </SakugaPageShell>
  );
}
