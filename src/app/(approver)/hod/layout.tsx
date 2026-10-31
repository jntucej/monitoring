"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { HodDesktopShell } from "./_shell/HodDesktopShell";
import { HodMobileShell } from "./_shell/HodMobileShell";

export default function HodLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["hod", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="hidden lg:block">
          <HodDesktopShell>{children}</HodDesktopShell>
        </div>
        <div className="block lg:hidden">
          <HodMobileShell>{children}</HodMobileShell>
        </div>
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}
