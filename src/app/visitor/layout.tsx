"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["visitor", "admin", "sysadmin"];

export default function VisitorTabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        <RoleConsole role="visitor" roleRoot="/visitor">
          {children}
        </RoleConsole>
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}
