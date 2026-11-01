"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/principal/shared/PrincipalLoadingStates";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PrincipalDesktopShell } from "./_shell/PrincipalDesktopShell";
import { PrincipalMobileShell } from "./_shell/PrincipalMobileShell";

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="hidden lg:block">
          <PrincipalDesktopShell>{children}</PrincipalDesktopShell>
        </div>
        <div className="block lg:hidden">
          <PrincipalMobileShell>{children}</PrincipalMobileShell>
        </div>

      </Suspense>
    </AuthGuard>
  );
}
