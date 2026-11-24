"use client";

import type { ReactNode } from "react";
import { ContextSituationBar, type PageActionItem } from "./ContextSituationBar";

export interface RolePageAction {
  id: string;
  label: string;
  href?: string;
  onClick?: () => Promise<void> | void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  disabledReason?: string;
}

export interface HighContextState<TItem> {
  role: string;
  purpose: string;
  liveSituation: string;
  severity: "info" | "ok" | "warn" | "critical";
  metrics: Array<{ label: string; value: string | number; hint?: string }>;
  items: TItem[];
  topActions: RolePageAction[];
}

export interface ActionablePageShellProps<TItem> {
  state: HighContextState<TItem>;
  contextLabel: string;
  statusPill?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  renderItem: (item: TItem, index: number) => ReactNode;
  children?: ReactNode;
}

function toPageAction(a: RolePageAction): PageActionItem {
  return {
    label: a.label,
    href: a.href,
    onClick: a.onClick ? () => void a.onClick?.() : undefined,
    tone: a.tone,
    disabled: a.disabled,
    disabledReason: a.disabledReason,
  };
}

/**
 * ActionablePageShell — unified page-level context + action contract combining
 * ContextSituationBar, live role metrics, and actionable item rendering.
 */
export function ActionablePageShell<TItem>({
  state,
  contextLabel,
  statusPill,
  loading = false,
  error = null,
  emptyMessage = "No items requiring action right now.",
  renderItem,
  children,
}: ActionablePageShellProps<TItem>) {
  const [primary, ...rest] = state.topActions;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 space-y-5">
      <ContextSituationBar
        roleLabel={state.role}
        purpose={state.purpose}
        contextLabel={contextLabel}
        statusTone={state.severity}
        statusPill={statusPill}
        statusSummary={state.liveSituation}
        primaryAction={primary ? toPageAction(primary) : undefined}
        secondaryActions={rest.slice(0, 2).map(toPageAction)}
      />

      {state.metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {state.metrics.map((m) => (
            <div key={m.label} className="surface-card bg-bg-surface p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                {m.label}
              </p>
              <p className="mt-1 text-lg font-bold text-text-primary">{m.value}</p>
              {m.hint && <p className="mt-0.5 text-[11px] text-text-muted">{m.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {error ? (
        <div className="surface-card bg-bg-surface p-4 text-xs text-action-danger">
          {error}
        </div>
      ) : loading && state.items.length === 0 ? (
        <div className="surface-card bg-bg-surface p-6 text-xs text-text-muted">
          Loading…
        </div>
      ) : state.items.length === 0 ? (
        <div className="surface-card bg-bg-surface p-6 text-xs text-text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {state.items.map((item, idx) => renderItem(item, idx))}
        </div>
      )}

      {children}
    </div>
  );
}

export default ActionablePageShell;
