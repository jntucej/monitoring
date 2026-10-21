"use client";

import React, { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import type { Role } from "@/lib/types";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </AuthGuard>
  );
}
