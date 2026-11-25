"use client";

import { Suspense, lazy } from "react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StudentAttendancePage = lazy(
  () => import("@/components/student/StudentAttendancePage")
);

export default function AttendancePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Student"
        purpose="Monitor overall attendance rate, safe skips, class schedule, and file attendance disputes"
        contextLabel="Attendance & Safe Skips"
        statusSummary="Track your semester class attendance against requirements, review daily logs, and file period disputes."
        why="Maintaining at least 75% attendance prevents exam debarment. Use Safe Skips to plan leaves safely or file a dispute if marked absent by mistake."
        primaryAction={{ label: "Attendance Calendar", href: "/student/attendance-calendar" }}
        secondaryAction={{ label: "Gate Scan Log", href: "/student/history" }}
      />
      <Suspense fallback={null}>
        <StudentAttendancePage />
      </Suspense>
    </div>
  );
}
