"use client";

import { Suspense, lazy } from "react";

const StudentScholarshipsPage = lazy(() => import("@/components/student/StudentScholarshipsPage"));

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={null}>
      <StudentScholarshipsPage />
    </Suspense>
  );
}
