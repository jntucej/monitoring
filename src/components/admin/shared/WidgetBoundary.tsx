"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";

export class WidgetBoundary extends React.Component<
  { title?: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[widget]", this.props.title, error); }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {this.props.title ?? "Widget"} failed to load
          </p>
          <p className="mt-1 text-xs opacity-70">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}