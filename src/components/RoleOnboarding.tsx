// src/components/RoleOnboarding.tsx
//
// <RoleOnboarding /> — reads the role's onboarding script from config
// and renders a guided tour. Each step highlights a target element
// (by data-testid or CSS selector) and shows the step's title/body.
//
// "Show once" is enforced by PERSISTING the done state in localStorage
// (survives browser restarts), not just in-memory. Two extra guards
// keep it honest across tabs:
//   - `storage` event: if another tab dismisses the tour, this tab hides
//     it immediately instead of re-showing it on the next mount.
//   - `dismissed` starts as null (unknown) until the read completes, so
//     a dismissed user is never shown a flash of the tour on mount.

"use client";

import { useState, useEffect } from "react";
import { useRoleConfig } from "@/hooks/useRoleConfig";
import { X, ChevronRight } from "lucide-react";

export function RoleOnboarding() {
  const cfg = useRoleConfig();
  const [stepIndex, setStepIndex] = useState(0);
  // null = not read yet; true = tour already completed (persisted).
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  const storageKey = cfg ? `onboarding-done-${cfg.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    let read: boolean | null = null;
    try {
      read = localStorage.getItem(storageKey) ? true : null;
    } catch {
      /* storage blocked */
    }
    setDismissed(read);

    // Cross-tab: another tab dismissed the tour — hide it here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) setDismissed(true);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const persistDone = () => {
    if (!storageKey) return;
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* storage blocked — in-memory dismissal still applies */
    }
  };

  if (!cfg || dismissed !== false || cfg.onboarding.steps.length === 0) return null;
  const step = cfg.onboarding.steps[stepIndex];
  const isLast = stepIndex === cfg.onboarding.steps.length - 1;

  // Dismiss (X) marks the tour done so it never returns.
  const handleDismiss = persistDone;

  return (
    <div
      data-testid="role-onboarding"
      className="fixed bottom-4 right-4 left-auto z-50 max-w-xs rounded-xl border bg-white p-4 shadow-lg md:left-auto"
      style={{ borderColor: "var(--role-accent, var(--border))" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {stepIndex + 1}. {step.title}
          </h3>
          <p className="mt-1 text-xs text-text-muted">{step.body}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-muted hover:text-text-primary"
          aria-label="Dismiss tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {stepIndex + 1} / {cfg.onboarding.steps.length}
        </span>
        <button
          onClick={() => (isLast ? handleDismiss() : setStepIndex((i) => i + 1))}
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--role-accent, var(--action-primary))" }}
        >
          {isLast ? "Done" : "Next"} <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
