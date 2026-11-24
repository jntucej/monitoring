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
          primaryAction={{ label: "Academic Marks", href: "/student/marks" }}
          secondaryAction={{ label: "Coursework Assignments", href: "/student/assignments" }}
        />
        <Suspense fallback={null}>
          <StudentExamsPage />
        </Suspense>
      </div>
    </SakugaPageShell>
  );
}
