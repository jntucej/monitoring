"use client";

import { Suspense, lazy } from "react";

const StudentExamsPage = lazy(() => import("@/components/student/StudentExamsPage"));

export default function ExamsPage() {
  return (
    <Suspense fallback={null}>
      <StudentExamsPage />
    </Suspense>
  );
}
