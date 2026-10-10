// src/components/shared/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'client_error',
        comment: `${error.message}\n${info.componentStack}`,
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">Something went wrong</h2>
          <p className="text-[var(--text-muted)] mb-6 max-w-md text-sm">
            {this.state.error?.message ?? 'An unexpected error occurred in this view.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg transition"
          >
            <RefreshCw className="w-4 h-4" /> Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
