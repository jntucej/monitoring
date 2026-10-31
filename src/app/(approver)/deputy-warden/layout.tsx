"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleDesktopShell } from "@/components/shell/RoleDesktopShell";
import { RoleMobileShell } from "@/components/shell/RoleMobileShell";
import { DEPUTY_WARDEN_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "deputy_warden",
  brand: { short: "Deputy Warden", long: "Hostel Ops" },
  rootHref: "/deputy-warden",
  storageKey: NAV_STORAGE_KEY,
  nav: DEPUTY_WARDEN_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"] as Role[]}>
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
