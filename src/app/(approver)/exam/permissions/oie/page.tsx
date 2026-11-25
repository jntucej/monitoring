"use client";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ExamPermissionsPanel } from "../_panel";

export default function ExamPermissionsOie() {
  return (
    <AuthGuard allowedRoles={["exam_superintendent", "exam_branch", "oie", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-4 min-w-0">
          <ContextSituationBar
            roleLabel="Officer In-Charge of Examinations"
            purpose="Review and adjudicate pending candidate exam clearance and permission requests"
            why="Adjudicating candidate clearance workflows ensures hall tickets and exam gate passes are verified ahead of session start."
            contextLabel="OIE Exam Permissions"
            statusTone="info"
            statusSummary="Adjudicate exam-day hall permits and student clearance approvals."
            primaryAction={{ label: "VP Permissions Queue", href: "/exam/permissions/vice-principal" }}
            secondaryActions={[
              { label: "OIE Console", href: "/oie" },
              { label: "Day Access", href: "/oie/examination-day-access" },
            ]}
          />
          <ExamPermissionsPanel queue="oie" />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
