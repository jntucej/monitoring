"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { EXAM_BRANCH_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "exam_branch",
  brand: { short: "Exam Branch", long: "Records Console" },
  rootHref: "/exam-branch",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: EXAM_BRANCH_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard
      allowedRoles={["exam_branch", "principal", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
