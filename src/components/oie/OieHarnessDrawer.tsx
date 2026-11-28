"use client";

/**
 * OieHarnessDrawer — the floating OIE Dev Harness: 6 LIVE, reversible
 * mutations against the real DB (no mock store). Each button fires a real
 * /api/oie/harness write and invalidates the cached OIE state so the KPIs /
 * feeds update live — the closed-loop proof.
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { FlaskConical, RefreshCw } from "lucide-react";

type HarnessAction =
  | "switch_calendar_phase"
  | "simulate_post_lock_amendment"
  | "simulate_duplicate_sbi_webhook"
  | "inject_linter_error"
  | "simulate_circular_recall"
  | "inject_statutory_grievance";

const ACTIONS: Array<{ action: HarnessAction; label: string; detail?: Record<string, unknown> }> = [
  { action: "switch_calendar_phase", label: "Switch Phase", detail: { phase: "ROLLOVER_STAGING" } },
  { action: "simulate_post_lock_amendment", label: "Post-Lock Amendment" },
  { action: "simulate_duplicate_sbi_webhook", label: "Duplicate SBI Webhook" },
  { action: "inject_linter_error", label: "Inject Linter Error" },
  { action: "simulate_circular_recall", label: "Recall Circular" },
  { action: "inject_statutory_grievance", label: "Statutory Grievance" },
];

export function OieHarnessPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg backdrop-blur hover:bg-zinc-800"
      aria-label="Open OIE Dev Harness"
    >
      <FlaskConical className="size-4" /> OIE Harness
    </button>
  );
}

export function OieHarnessDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = async (a: HarnessAction, detail?: Record<string, unknown>) => {
    setRunning(a);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/oie/harness", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mutation: a, ...detail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      setResult({ [a]: JSON.stringify(json.data ?? {}) });
      invalidateApiCache(["/api/oie/state", "/api/config/catalog"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  };

  return (
    <Drawer isOpen={open} onClose={onClose} title="OIE Harness" placement="right">
      <div className="space-y-3">
        <p className="text-xs text-text-secondary">
          Live, reversible mutations against the real DB. Each one updates the
          OIE dashboard state immediately — closed-loop, no mock store.
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
        <Button variant="ghost" size="sm" onPress={onClose}>
          <RefreshCw className="mr-1 size-4" /> Close
        </Button>
      </div>
    </Drawer>
  );
}
