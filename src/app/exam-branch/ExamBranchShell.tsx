"use client";

import React, { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

export function ExamBranchShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard
      allowedRoles={[
        "exam_branch",
        "oie",
        "vice_principal",
        "principal",
        "admin",
        "sysadmin",
      ] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="exam_branch" roleRoot="/exam-branch">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
