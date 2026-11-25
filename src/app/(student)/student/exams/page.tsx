"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StudentExamsPage = lazy(() => import("@/components/student/StudentExamsPage"));

export default function ExamsPage() {
  return (
    <SakugaPageShell>
      <div className="space-y-4">
        <ContextSituationBar
          roleLabel="Student"
          purpose="Check exam timetables, hall ticket allocations, seat arrangements, and results"
          contextLabel="Examinations & Assessments"
          statusSummary="Access upcoming examination timetables, assessment schedules, and room allocations."
          why="Review exam session dates, hall numbers, and required exam guidelines prior to reporting to examination centres."
          primaryAction={{ label: "Academic Marks", href: "/student/marks" }}
          secondaryActions={[
            { label: "Coursework Assignments", href: "/student/assignments" },
            { label: "Raise Class Request", href: "/student/class-requests" },
          ]}
        />
        <Suspense fallback={null}>
          <StudentExamsPage />
        </Suspense>
      </div>
    </SakugaPageShell>
  );
}
