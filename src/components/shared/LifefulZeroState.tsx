"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export interface LifefulZeroStateAction {
  label: string;
  href: string;
  tone?: "primary" | "secondary";
}

export interface LifefulZeroStateProps {
  title: string;
  whyEmpty: string;
  examplePreview: string;
  actions?: LifefulZeroStateAction[];
}

/**
 * LifefulZeroState — purposeful visual empty state explaining:
 * 1. Why the list is empty right now
 * 2. What normal activity looks like here (muted preview)
 * 3. 1-2 contextual next-step buttons
 */
export function LifefulZeroState({
  title,
  whyEmpty,
  examplePreview,
  actions = [],
}: LifefulZeroStateProps) {
  return (
    <section
      aria-label={title}
      className="surface-card bg-bg-surface p-5 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="size-4 text-action-success shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-secondary">{whyEmpty}</p>
        </div>
      </div>

      <div className="bg-bg-elevated px-3 py-2.5 text-[11px] text-text-muted space-y-1">
        <p className="font-medium text-text-secondary">What appears here when active:</p>
        <p>{examplePreview}</p>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {actions.map((act) => (
            <Link
              key={act.href + act.label}
              href={act.href}
              className={`min-h-11 inline-flex items-center px-3 py-1.5 text-xs font-semibold ${
                act.tone === "primary"
                  ? "bg-action-primary text-white"
                  : "bg-bg-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {act.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default LifefulZeroState;
