"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleDesktopShell } from "@/components/shell/RoleDesktopShell";
import { RoleMobileShell } from "@/components/shell/RoleMobileShell";
import { STUDENT_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import type { Role } from "@/lib/types";
import { useNavContext } from "@/hooks/useNavContext";
import type { NavContext } from "@/components/shell/types";

const MANIFEST_BASE = {
  role: "student",
  brand: { short: "Student", long: "Campus Console" },
  rootHref: "/student",
  storageKey: NAV_STORAGE_KEY,
  nav: STUDENT_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  // P1: the live NavContext slice the sidebar evaluates `when(ctx)` against.
  // The manifest is static; this makes the same nav render differently for a
  // day scholar vs a hosteller without a new component.
  const navContext = useNavContext("student");
  const MANIFEST = { ...MANIFEST_BASE, navContext };

  return (
    <AuthGuard allowedRoles={["student", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="hidden lg:block">
          <RoleDesktopShell manifest={MANIFEST}>{children}</RoleDesktopShell>
        </div>
        <div className="block lg:hidden">
          <RoleMobileShell manifest={MANIFEST}>{children}</RoleMobileShell>
        </div>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
