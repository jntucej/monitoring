"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { HodDesktopShell } from "./_shell/HodDesktopShell";

export default function HodLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["hod", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <HodDesktopShell>{children}</HodDesktopShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
