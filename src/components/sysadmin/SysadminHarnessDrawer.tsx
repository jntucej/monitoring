"use client";

/**
 * SysadminHarnessDrawer — the floating Sysadmin Dev Harness: 6 LIVE,
 * reversible mutations against the real DB (no mock store).
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { FlaskConical, RefreshCw } from "lucide-react";

type HarnessAction =
  | "inject_outbox_deadletter"
  | "trip_llm_circuit"
  | "inject_quorum_request"
  | "fire_duplicate_burst"
  | "inject_invalid_runtime"
  | "trigger_form_schema_hot_reload";

const ACTIONS: Array<{ action: HarnessAction; label: string; detail?: Record<string, unknown> }> = [
  { action: "inject_outbox_deadletter", label: "Inject DLQ Failure" },
  { action: "trip_llm_circuit", label: "Trip LLM Circuit (60s)" },
  { action: "inject_quorum_request", label: "Inject Principal Quorum" },
  { action: "fire_duplicate_burst", label: "Duplicate H0201+SBI Burst" },
  { action: "inject_invalid_runtime", label: "Invalid Runtime (Zod-block)" },
  { action: "trigger_form_schema_hot_reload", label: "Form Schema Hot-Reload" },
];

export function SysadminHarnessPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg backdrop-blur hover:bg-zinc-800"
      aria-label="Open Sysadmin Dev Harness"
    >
      <FlaskConical className="size-4" /> Sysadmin Harness
    </button>
  );
}

export function SysadminHarnessDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = async (a: HarnessAction, detail?: Record<string, unknown>) => {
    setRunning(a); setError(null); setResult(null);
    try {
      const res = await fetch("/api/sysadmin/harness", {
        method: "POST", credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mutation: a, ...detail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      setResult({ [a]: JSON.stringify(json.data ?? {}) });
      invalidateApiCache(["/api/sysadmin/state", "/api/config/catalog"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setRunning(null); }
  };

  return (
    <Drawer isOpen={open} onClose={onClose} title="Sysadmin Harness" placement="right">
      <div className="space-y-3">
        <p className="text-xs text-text-secondary">
          Live, reversible mutations against the real DB. Each updates the
          sysadmin dashboard state immediately — closed-loop, no mock store.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button key={a.action} size="sm" variant="secondary" isPending={running === a.action} onPress={() => fire(a.action, a.detail)}>
              {a.label}
            </Button>
          ))}
        </div>
        {result && (
          <div className="space-y-1 rounded-md border border-action-primary/40 bg-action-primary/10 p-3 text-xs">
            {Object.entries(result).map(([k, v]) => <div key={k}><strong>{k}:</strong> <code>{v}</code></div>)}
          </div>
        )}
        {error && <div className="rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">{error}</div>}
        <Button variant="ghost" size="sm" onPress={onClose}><RefreshCw className="mr-1 size-4" /> Close</Button>
      </div>
    </Drawer>
  );
}
