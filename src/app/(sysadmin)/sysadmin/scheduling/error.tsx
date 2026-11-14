"use client";
// SCAFFOLD:RICH-ERROR — route-level error boundary.
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportClientError } from "@/lib/monitoring";

export default function SchedulingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { component: "SchedulingPage" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="size-6 text-action-warning" aria-hidden />
      <h1 className="text-lg font-semibold text-text-primary">
        AI Smart Scheduling Assistant unavailable
      </h1>
      <p className="max-w-md text-sm text-text-muted">
        {error.message || "The service did not respond."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="surface-card inline-flex items-center gap-2 bg-bg-elevated px-3 py-2 text-sm text-text-primary hover:bg-bg-surface"
      >
        <RefreshCw className="h-4 w-4" aria-hidden /> Try again
      </button>
    </div>
  );
}
