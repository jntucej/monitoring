"use client";

/* ── PrincipalWidgetBoundary ── */

import { memo, type ReactNode } from "react";

export const PrincipalWidgetBoundary = memo(function PrincipalWidgetBoundary({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
      {title && (
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</p>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
});
