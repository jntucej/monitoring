"use client";

import React, { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import type { Role } from "@/lib/types";

/**
 * Admin segment root layout — a bare AuthGuard pass-through.
 *
 * The manifest-driven shell (AdminSidebar + main column) lives in the inner
 * `(admin)/admin/layout.tsx` so every admin route under `/admin/*` gets the
 * sidebar. This outer layer only enforces the role gate; it deliberately
 * renders no chrome of its own so the shell is a single source of truth and
 * we never get a duplicate header / sidebar.
 *
 * (Previously this file owned the big horizontal NAV_GROUPS header. That
 * header was replaced by the collapsible AdminSidebar in Phase 1 parity work.)
 */
export default function AdminSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </AuthGuard>
  );
}
