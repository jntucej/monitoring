"use client";

import { Suspense, lazy } from "react";

const StudentFeesPage = lazy(() => import("@/components/student/StudentFeesPage"));

export default function FeesPage() {
  return (
    <Suspense fallback={null}>
      <StudentFeesPage />
    </Suspense>
  );
}
