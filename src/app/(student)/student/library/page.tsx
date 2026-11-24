"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StudentLibraryPage = lazy(() => import("@/components/student/StudentLibraryPage"));

export default function LibraryPage() {
  return (
    <SakugaPageShell>
      <div className="space-y-4">
        <ContextSituationBar
          roleLabel="Student"
          purpose="Check catalog holdings, active book issues, due dates, and outstanding library fines"
          contextLabel="Library & Books"
          statusSummary="Manage your issued volumes, track upcoming return deadlines, and discover library resources."
          primaryAction={{ label: "Assignments", href: "/student/assignments" }}
          secondaryActions={[
            { label: "Report Library Issue", href: "/student/complaints/new" },
            { label: "Student Home", href: "/student" },
          ]}
        />
        <Suspense fallback={null}>
          <StudentLibraryPage />
        </Suspense>
      </div>
    </SakugaPageShell>
  );
}
