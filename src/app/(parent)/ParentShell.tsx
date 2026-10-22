"use client";

import React, { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

export function ParentShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard
      allowedRoles={["parent", "guardian", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="parent" roleRoot="/parent">
            {children}
          </RoleConsole>
        </div>
      </Suspense>
    </AuthGuard>
  );
}
