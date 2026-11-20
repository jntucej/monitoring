/**
 * shared/pass/PassHub — the full student passes page.
 *
 * Orchestrates: active passes (with curfew timer + QR), create form,
 * quota card, and history. This is the single "passes" surface that
 * replaces the scattered ActivePasses + PassCreateForm + history bits.
 */

"use client";

import { useState } from "react";
import {
  Ticket,
  Plus,
  History,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePassTypesV2 } from "@/hooks/usePassTypes";
import { usePersona } from "@/hooks/usePersona";
import type { PassTypeConfig } from "@/lib/pass-types";
import { PassCreateFormV2 } from "@/components/shared/pass/PassCreateFormV2";
import { QuotaCard } from "@/components/shared/pass/QuotaCard";
import { CurfewTimer } from "@/components/shared/pass/CurfewTimer";
import { ActivePasses } from "@/components/student/ActivePasses";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

export interface PassHubProps {
  /** Restrict the create form to a single pass type. */
  initialCode?: string;
  /** Hide the create form (e.g. parent view). */
  hideCreate?: boolean;
  className?: string;
}

export function PassHub({ initialCode, hideCreate, className }: PassHubProps) {
  const persona = usePersona();
  const { configs } = usePassTypesV2({ persona });
  const [showHistory, setShowHistory] = useState(false);

  // Find the config that has a quota, to render the QuotaCard.
  const quotaConfig: PassTypeConfig | undefined = configs.find((c) => c.quotaKey && c.quotaLimit != null);

  // Find a config with expectedReturnRequired to drive the curfew timer.
  const curfewConfig: PassTypeConfig | undefined = configs.find((c) => c.curfewApplies);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-action-primary/10 text-action-primary">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary">My Passes</h1>
          <p className="text-xs text-text-muted">
            {persona === "hosteller" ? "Hosteller" : "Day scholar"} · persona-scoped
          </p>
        </div>
      </div>

      {/* Curfew timer (hosteller) */}
      {curfewConfig && (
        <WidgetBoundary name="curfew-timer">
          <CurfewTimer />
        </WidgetBoundary>
      )}

      {/* Active passes */}
      <WidgetBoundary name="active-passes">
        <ActivePasses />
      </WidgetBoundary>

      {/* Quota card */}
      {quotaConfig && (
        <WidgetBoundary name="quota-card">
          <QuotaCard config={quotaConfig} />
        </WidgetBoundary>
      )}

      {/* Create form */}
      {!hideCreate && (
        <WidgetBoundary name="pass-create">
          <div className="rounded-xl border border-border bg-bg-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-action-primary" />
              <h2 className="text-sm font-semibold text-text-primary">New pass</h2>
            </div>
            <PassCreateFormV2 mode="student" initialCode={initialCode} />
          </div>
        </WidgetBoundary>
      )}

      {/* History toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-action-primary"
        >
          <History className="h-3.5 w-3.5" />
          {showHistory ? "Hide history" : "View history"}
        </button>
        <span className="text-xs text-text-muted">
          {configs.length} pass types available
        </span>
      </div>
    </div>
  );
}

export default PassHub;
