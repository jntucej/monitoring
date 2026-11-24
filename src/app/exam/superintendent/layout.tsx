"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { EXAM_SUPER_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "exam_superintendent",
  brand: { short: "Exam Superintendent", long: "Exam Day Console" },
  rootHref: "/exam/superintendent",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: EXAM_SUPER_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["exam_superintendent", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
      </Suspense>
    </AuthGuard>
  );
}
