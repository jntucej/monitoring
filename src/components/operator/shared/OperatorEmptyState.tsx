"use client";

// src/components/operator/shared/OperatorEmptyState.tsx
// Operator-specific copy of @/components/shared/EmptyState

/**
 * OperatorEmptyState — a reusable empty/zero-state UI component.
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface OperatorEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

// Dev-only guard to catch action buttons with no click handler.
function warnActionWithNoHandler(action: ReactNode): void {
  if (process.env.NODE_ENV !== "development") return;
  if (!action || typeof action !== "object") return;
  const node = action as React.ReactElement<{ onClick?: unknown; disabled?: unknown }>;
  if ("props" in node) {
    const hasHandler = typeof node.props?.onClick === "function" || node.props?.disabled;
    if (!hasHandler) {
      console.warn(
        "[OperatorEmptyState] `action` element has no onClick handler and is not disabled. " +
          "It will render as an inert button. Add an onClick or disable it.",
        node,
      );
    }
  }
}

export function OperatorEmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: OperatorEmptyStateProps) {
  warnActionWithNoHandler(action);

  // Track the last announced message so the live region only
  // updates when the content *changes*.
  const announcement = `${title}${description ? `. ${description}` : ""}`;
  const [announced, setAnnounced] = useState<string | null>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      // Announce on first mount
      isFirst.current = false;
      setAnnounced(announcement);
      return;
    }
    if (announcement !== announced) {
      setAnnounced(announcement);
    }
  }, [announcement]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Visually hidden live region — only updated when the message changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announced}
      </div>

      {/* z-10 ensures this content renders above modal backdrops */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      >
        {icon && (
          <div className="mb-4 text-slate-500 opacity-60" aria-hidden="true">
            {icon}
          </div>
        )}

        <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>

        {description && (
          <p className="text-xs text-slate-500 max-w-xs">{description}</p>
        )}

        {action && <div className="mt-4">{action}</div>}
      </div>
    </>
  );
}

export default OperatorEmptyState;
