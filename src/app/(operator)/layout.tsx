"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { OperatorShell } from "./OperatorShell";
import type { Role } from "@/lib/types";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The gate desk is a focused scanning surface. No drawer, no floating
  // buttons, no side rail — the desk's own status strip + IN/OUT buttons
  // are the entire UI. This is the "operator UI is overwhelming" fix.
  const isDesk = pathname?.startsWith("/gate/") ?? false;

  if (isDesk) {
    return (
      <AuthGuard allowedRoles={["operator", "worker"] as Role[]}>
        <Suspense fallback={<PageLoading />}>{children}</Suspense>
      </AuthGuard>
    );
  }

  // /operator/* (dashboard, stats, transactions, lookup, claim, mode, ...)
  // and /worker/* (dashboard, shifts, work-orders, history) keep the full
  // OperatorShell. Its drawer + floating buttons match the widget layout
  // on /operator/page.tsx.
  return (
    <AuthGuard allowedRoles={["operator", "worker"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <OperatorShell>{children}</OperatorShell>
      </Suspense>
    </AuthGuard>
  );
}
