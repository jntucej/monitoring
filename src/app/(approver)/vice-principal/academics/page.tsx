// src/app/(approver)/vice-principal/academics/page.tsx
// SCAFFOLD:ACADEMICS — thin wrapper. All logic lives in the panel.
// Compliance: AuthGuard + Suspense + WidgetBoundary + DevContactStrip.

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AcademicsDepartmentPanel } from "@/components/approver/AcademicsDepartmentPanel";
import type { Role } from "@/lib/types";


const ALLOWED: Role[] = [
  "sysadmin", "admin", "principal", "vice_principal", "exam_branch", "oie", "hod",
];

function AcademicsDepartmentsInner() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <WidgetBoundary title="Academics Department Analytics">
        <AcademicsDepartmentPanel />
      </WidgetBoundary>
      <DevContactStrip />
    </div>
  );
}

export default function AcademicsDepartmentsPage() {
  return (
    <AuthGuard allowedRoles={ALLOWED}>
      <Suspense fallback={<PageLoading />}>
        <AcademicsDepartmentsInner />
      </Suspense>
    </AuthGuard>
  );
}
