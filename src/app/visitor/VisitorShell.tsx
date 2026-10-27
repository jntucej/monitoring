"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["visitor", "admin", "sysadmin"];

export function VisitorShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        {children}
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}
