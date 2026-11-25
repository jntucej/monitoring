"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { WORKER_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "worker",
  brand: { short: "Worker", long: "Worker Console" },
  rootHref: "/worker",
  storageKey: NAV_STORAGE_KEY,
  nav: WORKER_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["worker"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
      </Suspense>
    </AuthGuard>
  );
}
