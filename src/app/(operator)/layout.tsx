import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { OperatorShell } from "./OperatorShell";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/AuthGuard";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Operator · Gate Monitor",
};

/**
 * Root layout for the (operator) route group.
 *
 * The gate desk at /gate/[gateId] is a chrome-free scanning surface:
 * the camera is the page and the two IN/OUT buttons are the only
 * tappable elements bottom-centre. Mounting the operator drawer, the
 * floating hamburger/settings buttons, and a GatePickerScreen wrapper
 * over it defeats that design — the desk page already renders its own
 * GatePickerScreen when the operator is unassigned, plus the offline
 * banner, scanner, and confirm card. So /gate/* must render bare
 * (AuthGuard only, no shell chrome).
 *
 * The branch decision uses usePathname (a client hook), so it lives in
 * the small client component `GateAwareOperatorShell` below: on /gate/*
 * it renders AuthGuard-only; everywhere else it renders the full
 * OperatorShell (drawer + rail + floating buttons).
 *
 * The nested (operator)/operator/layout.tsx adds the RoleDesktopShell /
 * RoleMobileShell chrome for /operator/* pages only — that is one shell
 * per tree, not two: this root layout never mounts a RoleShell.
 */
export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GateAwareOperatorShell>
      {children}
    </GateAwareOperatorShell>
  );
}

function GateAwareOperatorShell({ children }: { children: React.ReactNode }) {
  "use client";
  const pathname = usePathname();

  if (pathname?.startsWith("/gate/")) {
    // Desk owns the viewport. AuthGuard enforces the role; the page
    // renders everything else (picker, scanner, IN/OUT, banners).
    return <AuthGuard allowedRoles={["operator"] as const}>{children}</AuthGuard>;
  }

  return <OperatorShell>{children}</OperatorShell>;
}
