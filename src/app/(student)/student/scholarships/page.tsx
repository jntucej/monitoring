"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StudentScholarshipsPage = lazy(() => import("@/components/student/StudentScholarshipsPage"));

export default function ScholarshipsPage() {
  return (
    <SakugaPageShell>
      <div className="space-y-4">
        <ContextSituationBar
          roleLabel="Student"
          purpose="Track merit scholarships, welfare endowments, grant disbursements, and eligibility criteria"
          contextLabel="Scholarships & Financial Aid"
          statusSummary="Explore eligible scholarship programs, application statuses, and disbursement records."
          primaryAction={{ label: "College Fees", href: "/student/fees" }}
          secondaryActions={[
            { label: "Report Aid Issue", href: "/student/complaints/new" },
            { label: "Student Home", href: "/student" },
          ]}
        />
        <Suspense fallback={null}>
          <StudentScholarshipsPage />
        </Suspense>
      </div>
    </SakugaPageShell>
  );
}
