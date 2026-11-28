"use client";

/**
 * DevHarnessDrawer — the 8-switch Live Dev Harness.
 *
 * A floating corner pill ("Harness Mode") opens a HeroUI Drawer with 8 live
 * switches that mutate the SHARED live DB (via POST /api/harness, env-gated
 * to development) and invalidate the TanStack/Query cache across both
 * dashboards. In production the API returns 404 and the drawer shows a
 * "development-only" notice — zero production exposure.
 */
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  User,
  CalendarClock,
  PencilLine,
  Zap,
  RotateCcw,
  PackagePlus,
  BrainCircuit,
  Clock,
} from "lucide-react";
import { useApiResource, invalidateApiCache } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";

type SwitchKey =
  | "persona"
  | "calendar_phase"
  | "amend"
  | "llm_circuit"
  | "superseded"
  | "inject_field"
  | "knowledge_gap"
  | "sla";

export function DevHarnessDrawer() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<SwitchKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: circuitData } = useApiResource<{ success: boolean; data: { circuitOpen: boolean } }>(
    "/api/agent/llm-circuit",
    { ttlMs: 30_000, enabled: open },
  );
  const llmOpen = circuitData?.data?.circuitOpen ?? false;

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
        // Invalidate the shared caches so both dashboards re-render live.
        invalidateApiCache(["/api/student/state", "/api/faculty/state", "/api/config/catalog"]);
        setNotice(`✓ ${key} applied`);
      } else {
        setNotice(json.error?.message ?? "Failed");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Network error");
    }
    setBusy(null);
  };

  const switches: Array<{ key: SwitchKey; label: string; icon: React.ReactNode; body: () => Record<string, unknown> }> = [
    {
      key: "persona",
      label: "Hosteller ↔ Day Scholar",
      icon: <User className="h-4 w-4" />,
      body: () => ({ action: "set_persona", value: "hosteller" }),
    },
    {
      key: "calendar_phase",
      label: "Calendar Phase: PRE_EXAM_WINDOW",
      icon: <CalendarClock className="h-4 w-4" />,
      body: () => ({ action: "set_calendar_phase", value: "PRE_EXAM_WINDOW" }),
    },
    {
      key: "amend",
      label: "Simulate Post-Lock Amendment",
      icon: <PencilLine className="h-4 w-4" />,
      body: () => ({ action: "simulate_amendment" }),
    },
    {
      key: "llm_circuit",
      label: llmOpen ? "LLM Circuit: CLOSED" : "LLM Circuit: OPEN",
      icon: <Zap className="h-4 w-4" />,
      body: () => ({ action: "toggle_llm_circuit", value: !llmOpen }),
    },
    {
      key: "superseded",
      label: "Simulate Circular Recall",
      icon: <RotateCcw className="h-4 w-4" />,
      body: () => ({ action: "stamp_superseded", value: {} }),
    },
    {
      key: "inject_field",
      label: "Inject parent_consent_otp",
      icon: <PackagePlus className="h-4 w-4" />,
      body: () => ({ action: "inject_form_field", value: { formKey: "outing_pass", field: "parent_consent_otp" } }),
    },
    {
      key: "knowledge_gap",
      label: "Trigger Knowledge Gap",
      icon: <BrainCircuit className="h-4 w-4" />,
      body: () => ({ action: "trigger_knowledge_gap", value: { question: "When is the next mid-term?" } }),
    },
    {
      key: "sla",
      label: "Fast-Forward SLA",
      icon: <Clock className="h-4 w-4" />,
      body: () => ({ action: "fast_forward_sla", value: {} }),
    },
  ];

  return (
    <>
      {/* Floating pill */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
        title="Open the Live Dev Harness"
      >
        <FlaskConical className="h-4 w-4" />
        Harness Mode
      </button>

      <Drawer isOpen={open} onClose={() => setOpen(false)} title="Live Dev Harness" placement="right">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            8 reversible live mutations. Dev-only (NODE_ENV=development) — in
            production the API returns 404 and nothing is written.
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
