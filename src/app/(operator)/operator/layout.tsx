"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

// (operator)/layout.tsx mounts OperatorShell for /operator/* pages. This
// sub-layout adds no shell of its own — one shell per tree, not two.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["operator", "worker"] as Role[]}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </AuthGuard>
  );
}
