"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleDesktopShell } from "@/components/shell/RoleDesktopShell";
import { RoleMobileShell } from "@/components/shell/RoleMobileShell";
import { STAFF_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "staff",
  brand: { short: "Staff", long: "Staff Console" },
  rootHref: "/staff",
  storageKey: NAV_STORAGE_KEY,
  nav: STAFF_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["staff", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="hidden lg:block">
          <RoleDesktopShell manifest={MANIFEST}>{children}</RoleDesktopShell>
        </div>
        <div className="block lg:hidden">
          <RoleMobileShell manifest={MANIFEST}>{children}</RoleMobileShell>
        </div>
      </Suspense>
    </AuthGuard>
  );
}
