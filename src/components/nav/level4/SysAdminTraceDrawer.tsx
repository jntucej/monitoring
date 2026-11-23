"use client";
// src/components/nav/level4/SysAdminTraceDrawer.tsx
// Level-4 (root infra / sysadmin) record-trace drawer: a right-hand slide-over
// that surfaces the trace target (user / gate / device / job / ticket) with a
// diagnostics grid and deep links into the canonical sysadmin audit / session
// / runbook routes. Purely presentational — callers build the
// SysAdminTraceTarget and pass `trace` (null closes the drawer).

import { useEffect } from "react";
import Link from "next/link";
import { Activity, X, ChevronRight } from "lucide-react";

export interface SysAdminTraceTarget {
  entityType: "user" | "gate" | "device" | "job" | "ticket";
  identifier: string;
  label: string;
  diagnostics: Array<{ label: string; value: string }>;
  traceRoutes: Array<{ label: string; href: string }>;
}

interface Props {
  trace: SysAdminTraceTarget | null;
  onClose: () => void;
}

/**
 * Right slide-over drawer for the sysadmin trace target. Renders when
 * `trace` is non-null; closes on backdrop click, X click, or Escape.
 */
export function SysAdminTraceDrawer({ trace, onClose }: Props) {
  useEffect(() => {
    if (!trace) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trace, onClose]);

  if (!trace) return null;

  const traceUri = `sysadmin://${trace.entityType}/${trace.identifier}`;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Trace ${trace.label}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Right slide-over */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="surface-card px-4 py-3 border-b border-border flex items-start gap-3">
          <Activity className="w-4 h-4 text-action-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] text-text-muted break-all">
              {traceUri}
            </p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {trace.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors shrink-0"
            aria-label="Close trace drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Diagnostics grid (2-col) */}
          {trace.diagnostics.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">
                Diagnostics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {trace.diagnostics.map((d) => (
                  <div
                    key={d.label}
                    className="bg-bg-elevated/60 rounded-md px-2.5 py-1.5 border border-border/50 min-w-0"
                  >
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">
                      {d.label}
                    </p>
                    <p className="text-xs text-text-secondary font-mono break-all">
                      {d.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trace routes */}
          {trace.traceRoutes.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">
                Trace routes
              </h3>
              <ul className="space-y-1">
                {trace.traceRoutes.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-bg-elevated/40 hover:bg-bg-elevated border border-border/40 hover:border-border transition-colors group"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-action-primary transition-colors shrink-0" />
                      <span className="text-xs text-text-secondary flex-1 min-w-0 truncate">
                        {r.label}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted break-all">
                        {r.href}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Footer note */}
          <p className="text-[10px] text-text-muted leading-relaxed border-t border-border/40 pt-3">
            Open the linked routes to inspect sessions, audit events, and
            runbooks for this record. Routes are server-authorized to the
            sysadmin role.
          </p>
        </div>

        {/* Footer actions */}
        <div className="surface-card px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="font-mono text-[10px] text-text-muted">
            {trace.entityType} · L4
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
