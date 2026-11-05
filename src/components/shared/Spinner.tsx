"use client";
// src/components/shared/Spinner.tsx
// UI-audit fix 7: THE ONE spinner.
//
// Every role-specific loading component in the codebase (OperatorLoading,
// PrincipalLoading, AppLoadingScreen, CinematicLoader, SineWaveLoader, …)
// should re-export or wrap this instead of defining its own animation.
// 13 spinners → 1 spinner, 3 sizes.

export type SpinnerSize = "sm" | "md" | "lg";

const SIZES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export function Spinner({
  size = "md",
  label,
  className = "",
}: {
  size?: SpinnerSize;
  /** Accessible label announced by screen readers while loading. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label ?? "Loading"}
      className={`flex items-center justify-center ${className}`}
    >
      <div
        className={`animate-spin rounded-full border-[var(--accent,#6366f1)] border-t-transparent ${SIZES[size]}`}
        aria-hidden="true"
      />
    </div>
  );
}

export function PageSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`w-full space-y-3 ${className}`} role="status" aria-label="Loading page">
      <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--bg-elevated)]" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--bg-elevated)]" style={{ width: `${80 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function WidgetSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 ${className}`} role="status" aria-label="Loading widget">
      <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-elevated)]" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--bg-elevated)]" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4, className = "" }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading table">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="h-4 flex-1 animate-pulse rounded bg-[var(--bg-elevated)]" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Spinner;
