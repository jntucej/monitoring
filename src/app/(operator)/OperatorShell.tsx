"use client";
import React, { useState, useCallback, useRef } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useOperatorGate } from "@/hooks/useOperatorGate";
import { GatePickerScreen } from "@/components/operator/GatePickerScreen";
import { OperatorDrawer } from "@/components/operator/drawer/OperatorDrawer";
import { FloatingMenuButton } from "@/components/operator/drawer/FloatingMenuButton";
import { FloatingSettingsButton } from "@/components/operator/drawer/FloatingSettingsButton";
import type { Role } from "@/lib/types";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const ALLOWED_ROLES: Role[] = ["operator", "worker"];

export function OperatorShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <OperatorShellInner>{children}</OperatorShellInner>
    </AuthGuard>
  );
}

function OperatorShellInner({ children }: { children: React.ReactNode }) {
  const { role, assigned, loading } = useOperatorGate();
  const { md: isDesktop } = useBreakpoint({ md: "(min-width: 768px)" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Declared BEFORE the early returns below — calling useCallback after a
  // conditional return is a rules-of-hooks violation. The hook count changes
  // between renders whenever role/loading/assigned flips, which throws
  // Minified React error issue-310 ("too many re-renders" / hook-order crash)
  // on the operator console.
  const handleSettingsClick = useCallback(() => {
    profileRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (role === "worker") return <>{children}</>;
  if (loading) return null;
  if (!assigned) return <GatePickerScreen />;

  return (
    <div className="relative min-h-dvh bg-bg-base">
      {/* Left rail on tablet/desktop */}
      {isDesktop && (
        <OperatorDrawer open={true} onClose={() => {}} isRail={true} />
      )}

      {/* Main content — the responsive offset is pure CSS (md:/lg: media
          queries), NOT gated on the JS `isDesktop` flag. Gating it on the
          flag desynced with the rail's `hidden md:flex` (also pure CSS): on
          hydration the rail is 224px (CSS shows it) but main had no offset
          (JS isDesktop was still false) → the rail overlapped the content.
          Keep the offset in CSS so it and the rail can never desync. */}
      <main className="md:ml-56 lg:ml-64">
        <div ref={profileRef}>{children}</div>
      </main>

      {/* Floating buttons on mobile only */}
      {!isDesktop && (
        <>
          <FloatingMenuButton onClick={() => setDrawerOpen(true)} />
          <FloatingSettingsButton onClick={handleSettingsClick} />
          <OperatorDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </>
      )}
    </div>
  );
}
