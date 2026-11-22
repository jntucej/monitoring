"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";

const StudentMarksPage = lazy(() => import("@/components/student/StudentMarksPage"));

export default function MarksPage() {
  return (
    <SakugaPageShell>
      <Suspense fallback={null}>
        <StudentMarksPage />
      </Suspense>
    </SakugaPageShell>
  );
}
