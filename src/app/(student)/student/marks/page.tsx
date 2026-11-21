"use client";

import { Suspense, lazy } from "react";

const StudentMarksPage = lazy(() => import("@/components/student/StudentMarksPage"));

export default function MarksPage() {
  return (
    <Suspense fallback={null}>
      <StudentMarksPage />
    </Suspense>
  );
}
