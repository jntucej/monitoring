"use client";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ExamPermissionsPanel } from "../_panel";

export default function ExamPermissionsVp() {
  return (
    <AuthGuard allowedRoles={["exam_superintendent", "exam_branch", "oie", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ExamPermissionsPanel queue="vice_principal" />
      </Suspense>
    </AuthGuard>
  );
}
