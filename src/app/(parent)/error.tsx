"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportClientError } from "@/lib/monitoring";

export default function ParentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { route: "parent", component: "ParentError", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--action-danger)]/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-[var(--action-danger)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
        <p className="text-sm text-[var(--text-secondary)]">
                  ${error.message || "An unexpected error occurred in this workspace."}
                </p>
                ${error.digest ? `<p className="text-xs text-[var(--text-muted)] font-mono">ref: ${error.digest}</p>` : ""}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
