"use client";

import React, { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

const MESS_ALLOWED_ROLES: Role[] = [
  "mess_incharge",
  "principal",
  "admin",
  "sysadmin",
];

export function MessShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={MESS_ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="mess_incharge" roleRoot="/mess">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
