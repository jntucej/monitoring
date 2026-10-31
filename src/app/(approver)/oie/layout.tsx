"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleDesktopShell } from "@/components/shell/RoleDesktopShell";
import { RoleMobileShell } from "@/components/shell/RoleMobileShell";
import { OIE_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "oie",
  brand: { short: "OIE", long: "Exam Console" },
  rootHref: "/oie",
  storageKey: NAV_STORAGE_KEY,
  nav: OIE_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["oie", "exam_superintendent", "principal", "admin", "sysadmin"] as Role[]}>
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
