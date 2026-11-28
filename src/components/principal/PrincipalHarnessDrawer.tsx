"use client";

/**
 * PrincipalHarnessDrawer — the floating 6-mutation live Dev Harness for the
 * Principal dashboard. Each switch fires a REAL, reversible mutation against
 * the live DB (via /api/principal/harness) so the UI's degraded / blocked /
 * amber states are exercisable end-to-end — no in-memory mock store.
 *
 *   1. Inject Policy Linter Error   → overlapping tstzrange draft
 *   2. Simulate Co-Approver Quorum  → co-signs the pending request (2nd sig)
 *   3. Simulate Emergency Flood     → retroactive condonation relaxation draft
 *   4. Trigger Sysadmin Topology    → add_course / rebuild_hierarchy audit event
 *   5. Toggle LLM Circuit + DLQ     → flips Autopilot Health KPI to danger
 *   6. Test 1-Click Rollback        → reverts latest ACTIVE policy via pointer
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { FlaskConical, X } from "lucide-react";

type HarnessAction =
  | "inject_linter_error"
  | "simulate_co_approver"
  | "inject_emergency_flood"
  | "trigger_topology_alert"
  | "toggle_llm_circuit"
  | "test_rollback";

const ACTIONS: Array<{ action: HarnessAction; label: string; detail?: Record<string, unknown> }> = [
  { action: "inject_linter_error", label: "1 · Inject Policy Linter Error" },
  { action: "simulate_co_approver", label: "2 · Simulate Co-Approver Quorum Sign" },
  { action: "inject_emergency_flood", label: "3 · Simulate Emergency Flood Override" },
  { action: "trigger_topology_alert", label: "4 · Trigger Sysadmin Topology Alert", detail: { action: "add_course", resource: "B.Tech AI & DS" } },
  { action: "toggle_llm_circuit", label: "5 · Toggle LLM Circuit + Outbox DLQ", detail: { dlq: true, reason: "harness" } },
  { action: "test_rollback", label: "6 · Test 1-Click Rollback" },
];

export function PrincipalHarnessDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = async (a: HarnessAction, detail?: Record<string, unknown>) => {
    setRunning(a);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/principal/harness", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: a, detail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      setResult({ [a]: JSON.stringify(json.data ?? {}) });
      invalidateApiCache([
        "/api/principal/state",
        "/api/config/catalog",
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  };

  return (
    <Drawer isOpen={open} onClose={onClose} title="Principal Harness" placement="right">
      <div className="space-y-3">
        <p className="text-xs text-text-secondary">
          Live, reversible mutations against the real DB. Each one updates the
          dashboard state immediately so degraded / blocked states are testable.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant="secondary"
              isPending={running === a.action}
              onPress={() => fire(a.action, a.detail)}
            >
              {a.label}
            </Button>
          ))}
        </div>
        {result && (
          <div className="space-y-1 rounded-md border border-action-primary/40 bg-action-primary/10 p-3 text-xs">
            {Object.entries(result).map(([k, v]) => (
              <div key={k}><strong>{k}:</strong> <code>{v}</code></div>
            ))}
          </div>
        )}
        {error && <div className="rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">{error}</div>}
      </div>
    </Drawer>
  );
}

/** The floating corner pill that opens the harness drawer. */
export function PrincipalHarnessPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-bg-surface px-3 py-2 text-xs font-medium shadow-lg hover:bg-bg-elevated"
    >
      <FlaskConical className="size-4 text-action-primary" />
      Principal Harness
      <X className="size-3 text-text-secondary" />
    </button>
  );
}
