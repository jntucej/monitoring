"use client";

/**
 * HostelHarnessDrawer — the floating Hostel Dev Harness: 6 LIVE, reversible
 * mutations against the real DB (no mock store). Each fires /api/hostel/harness
 * and invalidates the cached state so the KPIs / watches update live.
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { FlaskConical, RefreshCw } from "lucide-react";

type HarnessAction =
  | "trigger_curfew_overdue"
  | "replay_duplicate_biometric_punch"
  | "simulate_offline_catchup_guard"
  | "inject_unmatched_exit_tailgating"
  | "simulate_bot_one_click_pass"
  | "inject_noisy_gps_ping";

const ACTIONS: Array<{ action: HarnessAction; label: string }> = [
  { action: "trigger_curfew_overdue", label: "Trigger Curfew Overdue" },
  { action: "replay_duplicate_biometric_punch", label: "Duplicate H0201 Punch (300s)" },
  { action: "simulate_offline_catchup_guard", label: "Offline Catch-Up Guard" },
  { action: "inject_unmatched_exit_tailgating", label: "UNMATCHED_EXIT Tailgating" },
  { action: "simulate_bot_one_click_pass", label: "@cej_server_bot 1-Click Pass" },
  { action: "inject_noisy_gps_ping", label: "Noisy GPS Ping (>30m)" },
];

export function HostelHarnessPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg backdrop-blur hover:bg-zinc-800"
      aria-label="Open Hostel Dev Harness"
    >
      <FlaskConical className="size-4" /> Hostel Harness
    </button>
  );
}

export function HostelHarnessDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = async (a: HarnessAction) => {
    setRunning(a); setError(null); setResult(null);
    try {
      const res = await fetch("/api/hostel/harness", {
        method: "POST", credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mutation: a }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      setResult({ [a]: JSON.stringify(json.data ?? {}) });
      invalidateApiCache(["/api/hostel/state", "/api/config/catalog"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setRunning(null); }
  };

  return (
    <Drawer isOpen={open} onClose={onClose} title="Hostel Harness" placement="right">
      <div className="space-y-3">
        <p className="text-xs text-text-secondary">
          Live, reversible mutations against the real DB. Each updates the
          hostel dashboard state immediately — closed-loop, no mock store.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button key={a.action} size="sm" variant="secondary" isPending={running === a.action} onPress={() => fire(a.action)}>
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
