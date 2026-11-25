"use client";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ExamPermissionsPanel } from "../_panel";

export default function ExamPermissionsVp() {
  return (
    <AuthGuard allowedRoles={["exam_superintendent", "exam_branch", "oie", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-4 min-w-0">
          <ContextSituationBar
            roleLabel="Vice Principal"
            purpose="Review and adjudicate escalated exam clearance and prerequisite permission tickets"
            why="Vice Principal review of escalated exam permissions ensures institutional condonation rules and prerequisites are upheld."
            contextLabel="VP Exam Permissions"
            statusTone="info"
            statusSummary="Adjudicate escalated exam hall tickets and student clearance approvals."
            primaryAction={{ label: "OIE Permissions Queue", href: "/exam/permissions/oie" }}
            secondaryActions={[
              { label: "VP Dashboard", href: "/vice-principal/home" },
              { label: "Exam Coordination", href: "/vice-principal/examination-coordination" },
            ]}
          />
          <ExamPermissionsPanel queue="vice_principal" />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
