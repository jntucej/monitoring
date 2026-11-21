"use client";

// src/components/shared/WidgetBoundary.tsx — patched by scripts/dashboard-fixup.mjs
// Fixes C2 (resetKey prop so an errored panel self-heals on the next poll).

import React from "react";
import { AlertTriangle } from "lucide-react";
import { hasCapability } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

interface Props {
  children: React.ReactNode;
  /** Legacy label — still accepted for backward compatibility. */
  title?: string;
  /** Newer alias for `title` (used for logging). */
  name?: string;
  fallback?: React.ReactNode;
  /** When this value changes, an errored boundary resets and re-renders. */
  resetKey?: unknown;
  /**
   * P1: gate the widget on a capability id. When present, the widget renders
   * nothing (or the fallback) unless `hasCapability(role, context, capability)`
   * passes. This is the single change that makes every existing widget
   * conditional without editing the widget itself.
   */
  capability?: string;
  /** The workspace context to evaluate the capability against. */
  context?: WorkspaceContext;
}

// The capability check lives in a small child so the error boundary still
// wraps the gated widget. Returns null when the cap isn't granted.
function CapabilityGate({
  capability,
  context,
  fallback,
  children,
}: {
  capability: string;
  context: WorkspaceContext;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.role) as Role | undefined;
  const granted = role ? hasCapability(role, context, capability) : false;
  if (!granted) return <>{fallback ?? null}</>;
  return <>{children}</>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error) {
    console.error("[WidgetBoundary]", this.props.name ?? this.props.title ?? "unnamed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center text-sm text-rose-400">
            <AlertTriangle className="h-5 w-5 mx-auto" />
            <p className="mt-2">Panel failed to load.</p>
          </div>
        )
      );
    }
    const { capability, context, children, fallback } = this.props;
    if (capability && context) {
      return (
        <CapabilityGate capability={capability} context={context} fallback={fallback}>
          {children}
        </CapabilityGate>
      );
    }
    return children;
  }
}
