"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { VPDesktopShell } from "./_shell/VPDesktopShell";
import { VPMobileShell } from "./_shell/VPMobileShell";

export default function VicePrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["vice_principal", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="hidden lg:block">
          <VPDesktopShell>{children}</VPDesktopShell>
        </div>
        <div className="block lg:hidden">
          <VPMobileShell>{children}</VPMobileShell>
        </div>
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}
