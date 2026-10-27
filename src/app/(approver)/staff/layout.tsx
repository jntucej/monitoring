"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

export default function StaffTabbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["staff", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="staff" roleRoot="/staff">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
