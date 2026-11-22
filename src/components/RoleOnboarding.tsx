// src/components/RoleOnboarding.tsx
//
// <RoleOnboarding /> — reads the role's onboarding script from config
// and renders a guided tour. Each step highlights a target element
// (by data-testid or CSS selector) and shows the step's title/body.
//
// The existing OnboardingTour component can be used for the actual
// visual tour; this component provides the role-specific content.

"use client";

import { useState, useEffect } from "react";
import { useRoleConfig } from "@/hooks/useRoleConfig";
import { X, ChevronRight } from "lucide-react";

export function RoleOnboarding() {
  const cfg = useRoleConfig();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Only show if there are steps and the user hasn't dismissed.
  // PERSIST in localStorage (not sessionStorage) so a returning user — even
  // in a brand-new tab or browser session — never sees the tour again.
  // sessionStorage is per-tab and cleared on close, which is why the tour
  // was "always showing like beginner" on every visit.
  useEffect(() => {
    if (!cfg) return;
    const storageKey = `onboarding-done-${cfg.id}`;
    try {
      if (localStorage.getItem(storageKey)) setDismissed(true);
    } catch { /* storage blocked */ }
  }, [cfg?.id]);

  const persistDone = () => {
    if (!cfg) return;
    setDismissed(true);
    try {
      localStorage.setItem(`onboarding-done-${cfg.id}`, "1");
    } catch { /* storage blocked */ }
  };

  if (!cfg || dismissed || cfg.onboarding.steps.length === 0) return null;
  const step = cfg.onboarding.steps[stepIndex];
  const isLast = stepIndex === cfg.onboarding.steps.length - 1;

  // Dismiss (X) marks the tour done so it never returns.
  const handleDismiss = persistDone;

  return (
    <div
      data-testid="role-onboarding"
      className="fixed bottom-4 left-4 z-50 max-w-xs rounded-xl border bg-white p-4 shadow-lg"
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
          onClick={() => isLast ? handleDismiss() : setStepIndex((i) => i + 1)}
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--role-accent, var(--action-primary))" }}
        >
          {isLast ? "Done" : "Next"} <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
