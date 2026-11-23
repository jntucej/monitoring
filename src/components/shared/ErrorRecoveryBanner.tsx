"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft, LogIn } from "lucide-react";

export function describeApiError(error: string | number | null | undefined): {
  title: string;
  guidance: string;
  kind: "auth" | "forbidden" | "not_found" | "conflict" | "locked" | "transient";
} {
  const raw = String(error ?? "").toLowerCase();
  if (raw.includes("401") || raw.includes("unauthorized") || raw.includes("expired")) {
    return {
      title: "Session expired",
      guidance: "Your session is no longer active. Sign in again to continue.",
      kind: "auth",
    };
  }
  if (raw.includes("403") || raw.includes("forbidden") || raw.includes("scope")) {
    return {
      title: "Outside permitted scope",
      guidance: "Your current role does not have access to this record or action.",
      kind: "forbidden",
    };
  }
  if (raw.includes("404") || raw.includes("not found")) {
    return {
      title: "Record not found",
      guidance: "This item may have been moved, archived, or removed.",
      kind: "not_found",
    };
  }
  if (raw.includes("409") || raw.includes("conflict") || raw.includes("already")) {
    return {
      title: "Record already updated",
      guidance: "Another stage owner updated this record. Refresh to see the latest state.",
      kind: "conflict",
    };
  }
  if (raw.includes("423") || raw.includes("locked")) {
    return {
      title: "Record temporarily locked",
      guidance: "This record is locked by an active workflow or security hold.",
      kind: "locked",
    };
  }
  return {
    title: "Could not load data",
    guidance: "A temporary network or server issue occurred. Try again in a moment.",
    kind: "transient",
  };
}

export function ErrorRecoveryBanner({
  error,
  onRetry,
  safeHomeHref = "/",
  safeHomeLabel = "Back to Home",
}: {
  error: string | number | null | undefined;
  onRetry?: () => void;
  safeHomeHref?: string;
  safeHomeLabel?: string;
}) {
  if (!error) return null;
  const info = describeApiError(error);

  return (
    <div
      role="alert"
      data-testid="error-recovery-banner"
      className="surface-card border border-rose-500/30 bg-rose-500/10 p-4 space-y-2.5 text-xs"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-action-danger shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-action-danger">{info.title}</p>
          <p className="text-text-muted">{info.guidance}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {info.kind === "auth" && (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 font-semibold text-white hover:opacity-95"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In Again</span>
          </Link>
        )}
        {(info.kind === "transient" || info.kind === "conflict" || info.kind === "locked") &&
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 font-semibold text-white hover:opacity-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{info.kind === "conflict" ? "Refresh Record" : "Retry"}</span>
            </button>
          )}
        {(info.kind === "forbidden" || info.kind === "not_found") && (
          <Link
            href={safeHomeHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-3 py-1.5 font-medium text-text-primary hover:bg-bg-elevated"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{safeHomeLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
