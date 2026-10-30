"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { DelegationForm, DelegationCard, DelegationHistory, DelegationConflictNotice } from "@/components/principal/delegation/DelegationForm";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { DelegationRule } from "@/components/principal/delegation/DelegationForm";
import { AlertTriangle, RefreshCw } from "lucide-react";

function DelegateRulesPageInner() {
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

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Delegation Rules</h1>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <DelegationForm onCreated={load} />

      {rules && rules.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Active Rules ({rules.filter((r) => r.isActive).length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rules.filter((r) => r.isActive).map((r) => (
              <DelegationCard key={r.id} rule={r} />
            ))}
          </div>
          {rules.some((r) => !r.isActive) && (
            <div className="mt-2">
              <h2 className="text-sm font-semibold text-[var(--text-muted)]">Inactive Rules ({rules.filter((r) => !r.isActive).length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                {rules.filter((r) => !r.isActive).map((r) => (
                  <DelegationCard key={r.id} rule={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : rules ? (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">No delegation rules yet. Create your first rule above.</p>
      ) : null}

      <DelegationHistory />
    </div>
  );
}

export default function DelegateRulesPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <DelegateRulesPageInner />
    </Suspense>
  );
}
