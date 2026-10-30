"use client";

// src/components/operator/shared/OperatorWidgetBoundary.tsx
// Operator-specific copy of @/components/shared/WidgetBoundary

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Legacy label — still accepted for backward compatibility. */
  title?: string;
  /** Newer alias for `title` (used for logging). */
  name?: string;
  fallback?: React.ReactNode;
  /** When this value changes, an errored boundary resets and re-renders. */
  resetKey?: unknown;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class OperatorWidgetBoundary extends React.Component<Props, State> {
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
    console.error("[OperatorWidgetBoundary]", this.props.name ?? this.props.title ?? "unnamed", error);
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
    return this.props.children;
  }
}
