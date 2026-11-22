"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";

const StudentLibraryPage = lazy(() => import("@/components/student/StudentLibraryPage"));

export default function LibraryPage() {
  return (
    <SakugaPageShell>
      <Suspense fallback={null}>
        <StudentLibraryPage />
      </Suspense>
    </SakugaPageShell>
  );
}
