"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminStewardState {
  kpi: {
    pendingDelegateActivations: number;
    activeDelegates: number;
    draftsAwaitingPrincipal: number;
    circulars: number;
    activeCirculars: number;
    recalledCirculars: number;
    pendingFeeItems: number;
    verifiedUtrCount: number;
    dedupHits: number;
    outbox: Record<string, number>;
    dlqCount: number;
    llmCircuit: any;
    retentionPolicies: number;
  };
  pendingDelegates: any[];
  activeDelegates: any[];
  routingPolicies: any[];
  circulars: any[];
  announcements: any[];
  feeItems: any[];
  paymentReferences: any[];
  dedupHits: any[];
  retentionPolicies: any[];
  outbox: { counts: Record<string, number>; dlq: any[] };
  llmCircuit: any;
  lifecyclePlaybooks: any[];
  academicRegulations: any[];
  policyRules: any[];
  generatedAt: number;
}

export function useAdminStewardState() {
  const [state, setState] = useState<AdminStewardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/steward/state");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Unknown error");
      setState(data.data as AdminStewardState);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchState();
  }, [fetchState]);

  return { state, loading, error, refresh };
}
