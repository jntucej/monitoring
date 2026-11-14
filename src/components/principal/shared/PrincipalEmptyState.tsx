"use client";

/* ── PrincipalEmptyState ── */

import { AlertCircle } from "lucide-react";

export function PrincipalEmptyState({
  title = "Nothing here",
  description = "This queue is clear.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="surface-card bg-bg-surface p-8 text-center">
      <AlertCircle className="mx-auto size-6 text-text-muted" />
      <p className="mt-3 text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </div>
  );
}
