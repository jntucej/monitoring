"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { GUARDIAN_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "guardian",
  brand: { short: "Guardian", long: "Parent & Guardian Portal" },
  rootHref: "/guardian",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: GUARDIAN_NAV,
};

export default function GuardianConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["guardian", "parent", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>
          {children}
        </RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
