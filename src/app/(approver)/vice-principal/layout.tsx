"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { VPDesktopShell } from "./_shell/VPDesktopShell";

export default function VicePrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["vice_principal", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <VPDesktopShell>{children}</VPDesktopShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
