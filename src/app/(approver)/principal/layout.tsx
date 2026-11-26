"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { PrincipalDesktopShell } from "./_shell/PrincipalDesktopShell";

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <PrincipalDesktopShell>{children}</PrincipalDesktopShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
