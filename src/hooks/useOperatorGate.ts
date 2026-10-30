"use client";
import { useAuthStore } from "@/stores/authStore";

export interface OperatorGateState {
  gateId: string | null;
  role: string | null;
  loading: boolean;
  assigned: boolean;
}

export function useOperatorGate(): OperatorGateState {
  const gateId = useAuthStore((s) => s.user?.gateId ?? null);
  const role = useAuthStore((s) => s.role);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return {
    gateId,
    role,
    loading: !hasHydrated,
    assigned: hasHydrated && !!gateId,
  };
}
