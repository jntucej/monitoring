"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";

const StudentExamsPage = lazy(() => import("@/components/student/StudentExamsPage"));

export default function ExamsPage() {
  return (
    <SakugaPageShell>
      <Suspense fallback={null}>
        <StudentExamsPage />
      </Suspense>
    </SakugaPageShell>
  );
}
