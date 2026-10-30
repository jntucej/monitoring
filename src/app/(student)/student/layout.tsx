"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

export default function StudentConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">{children}</div>
      </Suspense>
    </AuthGuard>
  );
}
