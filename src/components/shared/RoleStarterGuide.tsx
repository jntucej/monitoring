"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";

export interface RoleStarterGuideProps {
  guideId: string;
  title: string;
  summary: string;
  steps: [string, string, string];
  examples?: string[];
}

/**
 * RoleStarterGuide — dismissible 3-step visual mini-blueprint for first-time
 * users on unfamiliar surfaces, command bars, and submission forms.
 */
export function RoleStarterGuide({
  guideId,
  title,
  summary,
  steps,
  examples,
}: RoleStarterGuideProps) {
  const storageKey = `starter-guide-dismissed:${guideId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore storage errors */
    }
  };

  return (
    <aside
      aria-label={title}
      className="surface-card bg-bg-surface p-4 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="size-4 text-action-primary shrink-0" />
          <h2 className="text-xs font-semibold text-text-primary truncate">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={`Dismiss ${title}`}
          className="min-h-11 min-w-11 -my-2 -mr-2 inline-flex items-center justify-center text-text-muted hover:text-text-primary"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-xs text-text-secondary">{summary}</p>

      <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {steps.map((step, idx) => (
          <li key={step} className="flex items-center gap-1.5">
            <span className="rounded-full bg-bg-elevated px-2.5 py-1 font-medium text-text-primary">
              {idx + 1}. {step}
            </span>
            {idx < steps.length - 1 && (
              <span className="text-text-muted" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      {examples && examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
          <span className="text-text-muted font-medium">Examples:</span>
          {examples.map((ex) => (
            <code
              key={ex}
              className="rounded bg-bg-elevated px-2 py-0.5 font-mono text-text-secondary"
            >
              {ex}
            </code>
          ))}
        </div>
      )}
    </aside>
  );
}

export default RoleStarterGuide;
