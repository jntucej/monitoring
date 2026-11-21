"use client";

import { Suspense, lazy } from "react";

const StudentLibraryPage = lazy(() => import("@/components/student/StudentLibraryPage"));

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <StudentLibraryPage />
    </Suspense>
  );
}
