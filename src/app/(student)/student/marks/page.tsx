"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StudentMarksPage = lazy(() => import("@/components/student/StudentMarksPage"));

export default function MarksPage() {
  return (
    <SakugaPageShell>
      <div className="space-y-4">
        <ContextSituationBar
          roleLabel="Student"
          purpose="View internal marks, semester grade cards, credits earned, and GPA performance"
          contextLabel="Grades & Academic Marks"
          statusSummary="Track your subject-wise continuous evaluation, internal marks, and semester GPA."
          primaryAction={{ label: "Exams Schedule", href: "/student/exams" }}
          secondaryAction={{ label: "Assignments", href: "/student/assignments" }}
        />
        <Suspense fallback={null}>
          <StudentMarksPage />
        </Suspense>
      </div>
    </SakugaPageShell>
  );
}
