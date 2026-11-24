"use client";

import { Suspense, lazy } from "react";
import { SakugaPageShell } from "@/components/student/SakugaPageShell";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StudentFeesPage = lazy(() => import("@/components/student/StudentFeesPage"));

export default function FeesPage() {
  return (
    <SakugaPageShell>
      <div className="space-y-4">
        <ContextSituationBar
          roleLabel="Student"
          purpose="Review tuition fees, hostel dues, scholarship adjustments, and payment receipts"
          contextLabel="Fees & Financial Dues"
          statusSummary="Track fee payment installments, outstanding college balances, and transaction receipts."
          primaryAction={{ label: "Scholarships", href: "/student/scholarships" }}
          secondaryAction={{ label: "Mess Bill", href: "/student/mess-bill" }}
        />
        <Suspense fallback={null}>
          <StudentFeesPage />
        </Suspense>
      </div>
    </SakugaPageShell>
  );
}
