"use client";

import { Suspense, lazy } from "react";

const StudentAttendancePage = lazy(
  () => import("@/components/student/StudentAttendancePage")
);

export default function AttendancePage() {
  return (
    <Suspense fallback={null}>
      <StudentAttendancePage />
    </Suspense>
  );
}
