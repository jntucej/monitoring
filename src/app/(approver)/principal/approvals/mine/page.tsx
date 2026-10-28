"use client";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import type { Role } from "@/lib/types";
import { ApprovalsPanel } from "../_panel";

export default function PrincipalApprovalsMine() {
  return (
    <AuthGuard allowedRoles={["principal"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <ApprovalsPanel tab="mine" />
      </Suspense>
    </AuthGuard>
  );
}
