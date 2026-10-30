"use client";
import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useOperatorGate } from "@/hooks/useOperatorGate";
import { GatePickerScreen } from "@/components/operator/GatePickerScreen";
import type { Role } from "@/lib/types";

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
  if (role === "worker") return <>{children}</>;
  if (loading) return null;
  if (!assigned) return <GatePickerScreen />;
  return <>{children}</>;
}
