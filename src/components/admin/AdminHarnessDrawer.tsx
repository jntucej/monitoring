"use client";

import { useState, useCallback } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * AdminHarnessDrawer — floating Dev Harness for the ADMIN role.
 * 5 live reversible mutations:
 *   1. Simulate HOD Leave Nomination + SLA Breach
 *   2. Inject Policy Linter Error (overlapping tstzrange)
 *   3. Simulate Duplicate SBI Collect Challan
 *   4. Simulate Office Circular Recall
 *   5. Test Topology Lock Guardrail (ADMIN → SYSADMIN)
 */

const MUTATIONS = [
  {
    key: "simulate_leave_nomination",
    label: "HOD Leave Nomination + SLA Breach",
    desc: "Injects an HOD leave nomination. Activating the delegate reroutes a pending SLA-breached doubt to the delegate.",
  },
  {
    key: "inject_policy_linter_error",
    label: "Inject Policy Linter Error",
    desc: "Adds an overlapping tstzrange / empty role into the fee/regulation draft — proves PolicyDryRunDrawer hard-blocks submission.",
  },
  {
    key: "simulate_duplicate_challan",
    label: "Duplicate SBI Collect Challan",
    desc: "Replays the same utr_number twice — proves processed_events tags the 2nd hit DUPLICATE_IGNORED.",
  },
  {
    key: "simulate_circular_recall",
    label: "Office Circular Recall",
    desc: "Stamps SUPERSEDED on an active fee circular and tombstones linked RAG chunks.",
  },
  {
    key: "test_topology_lock",
    label: "Topology Lock Guardrail",
    desc: "Triggers an attempted add_course — proves ADMIN is hard-blocked and routed to SYSADMIN.",
  },
];

export function AdminHarnessPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
    >
      <span>⚙️</span>
      <span>Admin Harness</span>
    </button>
  );
}

export function AdminHarnessDrawer({
  open,
  onClose,
  onMutated,
}: {
  open: boolean;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fire = useCallback(
    async (key: string) => {
      setPending(key);
      setLastResult(null);
      try {
        const res = await fetch("/api/admin/steward/harness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mutation: key }),
        });
        const data = await res.json();
        if (data.success) {
          setLastResult(`✓ ${data.data.note ?? key}`);
          onMutated();
        } else {
          setLastResult(`✗ ${data.error ?? res.status}`);
        }
      } catch {
        setLastResult("Network error");
      } finally {
        setPending(null);
      }
    },
    [onMutated],
  );

  return (
    <Drawer isOpen={open} onClose={onClose} title="Admin Dev Harness" placement="right">
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Admin Dev Harness</span>
          <Badge variant="exit">5 live mutations</Badge>
        </div>
        {MUTATIONS.map((m) => (
          <div key={m.key} className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 space-y-2">
            <p className="text-sm font-medium">{m.label}</p>
            <p className="text-xs text-zinc-400">{m.desc}</p>
            <Button size="sm" variant="secondary" isPending={pending === m.key} onPress={() => fire(m.key)}>
              Fire
            </Button>
          </div>
        ))}
        {lastResult && (
          <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800/50">
            <p className="text-xs text-zinc-400">Last: {lastResult}</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
