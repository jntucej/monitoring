"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { DelegationCard, DelegationConflictNotice } from "@/components/principal/delegation/DelegationForm";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { DelegationRule } from "@/components/principal/delegation/DelegationForm";
import { AlertTriangle, CheckCircle } from "lucide-react";

function DelegateInForceInner() {
  const [rules, setRules] = useState<DelegationRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/delegation-rules");
      const json = await res.json();
      if (json.success) setRules(json.data?.rules ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  const active = rules?.filter((r) => r.isActive) ?? [];
  const conflicts = rules?.filter((r) => !r.isActive) ?? [];

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Delegation Rules — In Force</h1>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">
            Active Delegations ({active.length})
          </h2>
        </div>
        {active.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No active delegation rules.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {active.map((r) => (
              <DelegationCard key={r.id} rule={r} />
            ))}
          </div>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">
              Inactive / Conflicting ({conflicts.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {conflicts.map((r) => (
              <DelegationCard key={r.id} rule={r} />
            ))}
          </div>
          {conflicts.slice(0, 3).map((r) => (
            <DelegationConflictNotice key={r.id} ruleName={r.name} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DelegateInForcePage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <DelegateInForceInner />
    </Suspense>
  );
}
