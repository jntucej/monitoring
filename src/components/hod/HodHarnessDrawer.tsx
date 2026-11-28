"use client";

/**
 * HodHarnessDrawer — the HOD Live Dev Harness (dev-only).
 *
 * A floating corner pill ("HOD Harness") opens a HeroUI Drawer with 4
 * HOD-specific live mutations (mirrors the student/faculty DevHarnessDrawer
 * pattern). All mutations route through POST /api/harness with HOD-prefixed
 * actions. The endpoint is env-gated to NODE_ENV=development — in
 * production it returns 404 and no writes are made.
 *
 * Actions:
 *   1. hod_simulate_sla_breach   — breach a doubt_escalation deadline_watch
 *   2. hod_inject_low_enrollment — inject a synthetic low-enrollment course
 *   3. hod_simulate_bot_approval — approve a pending lab swap via @cej_server_bot
 *   4. hod_simulate_circular_recall — recall the latest published circular
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { FlaskConical, Clock, TrendingDown, Bot, RotateCcw } from "lucide-react";

type SwitchKey =
  | "sla_breach"
  | "low_enrollment"
  | "bot_approval"
  | "circular_recall";

export function HodHarnessDrawer() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<SwitchKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (key: SwitchKey, body: Record<string, unknown>) => {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch("/api/harness", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        invalidateApiCache([`/api/hod/os/state`, `/api/config/catalog`]);
        setNotice(`✓ ${key} applied`);
      } else {
        setNotice(json.error?.message ?? json.message ?? "Failed");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Network error");
    }
    setBusy(null);
  };

  const switches: Array<{ key: SwitchKey; label: string; icon: React.ReactNode; body: () => Record<string, unknown> }> = [
    {
      key: "sla_breach",
      label: "Simulate Faculty SLA Breach",
      icon: <Clock className="h-4 w-4" />,
      body: () => ({ action: "hod_simulate_sla_breach" }),
    },
    {
      key: "low_enrollment",
      label: "Inject Low-Enrollment Elective",
      icon: <TrendingDown className="h-4 w-4" />,
      body: () => ({ action: "hod_inject_low_enrollment", value: { code: "ELEC-HARNESS", enrollment: 12 } }),
    },
    {
      key: "bot_approval",
      label: "Simulate @cej_server_bot 1-Click Approval",
      icon: <Bot className="h-4 w-4" />,
      body: () => ({ action: "hod_simulate_bot_approval" }),
    },
    {
      key: "circular_recall",
      label: "Simulate Circular Recall Cascade",
      icon: <RotateCcw className="h-4 w-4" />,
      body: () => ({ action: "hod_simulate_circular_recall" }),
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
        title="Open the HOD Live Dev Harness"
      >
        <FlaskConical className="h-4 w-4" />
        HOD Harness
      </button>

      <Drawer isOpen={open} onClose={() => setOpen(false)} title="HOD Live Dev Harness" placement="left">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            4 reversible live mutations for the HOD dashboard. Dev-only
            (NODE_ENV=development) — in production the API returns 404 and
            nothing is written.
          </p>
          {notice && (
            <div className="rounded-lg border border-border bg-bg-elevated p-2 text-xs text-text-primary">
              {notice}
            </div>
          )}
          {switches.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm text-text-primary">
                {s.icon}
                <span>{s.label}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                onClick={() => run(s.key, s.body())}
              >
                {busy === s.key ? "…" : "Run"}
              </Button>
            </div>
          ))}
          <Badge variant="leave" dot={false}>
            Mutates the live DB · no mock store
          </Badge>
        </div>
      </Drawer>
    </>
  );
}
