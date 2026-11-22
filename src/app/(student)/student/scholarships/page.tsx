"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";

const StudentScholarshipsPage = lazy(() => import("@/components/student/StudentScholarshipsPage"));

export default function ScholarshipsPage() {
  return (
    <SakugaPageShell>
      <Suspense fallback={null}>
        <StudentScholarshipsPage />
      </Suspense>
    </SakugaPageShell>
  );
}
