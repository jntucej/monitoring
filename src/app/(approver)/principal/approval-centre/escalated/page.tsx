"use client";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ApprovalCentrePanel } from "../_panel";

export default function ApprovalCentreEscalatedPage() {
  return (
    <AuthGuard allowedRoles={["principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ApprovalCentrePanel status="ESCALATED" />
      </Suspense>
    </AuthGuard>
  );
}
