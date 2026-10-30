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

  if (role === "worker") return <>{children}</>;
  if (loading) return null;
  if (!assigned) return <GatePickerScreen />;

  const handleSettingsClick = useCallback(() => {
    profileRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)]">
      {/* Left rail on tablet/desktop */}
      {isDesktop && (
        <OperatorDrawer open={true} onClose={() => {}} isRail={true} />
      )}

      {/* Main content */}
      <main className={isDesktop ? "md:ml-56 lg:ml-64" : ""}>
        <div ref={profileRef}>{children}</div>
      </main>

      {/* Floating buttons on mobile/tablet */}
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
