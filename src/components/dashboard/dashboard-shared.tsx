/* ------------------------------------------------------------------ *
 *  Dashboard shared primitives — small presentational building blocks
 *  reused across the dashboard pages.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";

interface CardDivProps {
  children: ReactNode;
  className?: string;
}

/**
 * Generic card wrapper — matches the visual style of
 * `src/components/admin/CampusStatusCards.tsx` and
 * `src/components/admin/EntryExitChart.tsx`.
 */
export function CardDiv({ children, className = "" }: CardDivProps) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 ${className}`}>
      {children}
    </div>
  );
}
