"use client";

/**
 * AntiRaggingProgress — student-facing view of their own anti-ragging cases.
 *
 * Answers the two questions the student must be able to see:
 *   1. TO WHOM it is assigned (assignedTo / assignedToName / the Principal's
 *      office), and
 *   2. THE PROGRESS — which stage of the review chain the case is at
 *      (submitted → under_review → investigating → action_taken / referred /
 *      closed) + any committee notes + last update.
 *
 * It reads /api/anti-ragging/cases, which now returns ONLY the student's own
 * cases (filtered server-side by reporter_hash) + the assigned-to user name.
 * No new enforcement; purely a projection of the case status the admin console
 * already manages.
 */

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import {
  ShieldAlert,
  Loader2,
  UserCog,
  FileCheck,
  Gavel,
  Clock,
  CheckCircle2,
  GitBranch,
} from "lucide-react";

interface AntiRaggingCase {
  id: string;
  caseNumber: string;
  isAnonymous: boolean;
  category: string;
  severity: string;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  committeeNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// The progress chain, in order. A case's status maps to how far along it is.
const STATUS_CHAIN: Array<{ key: string; label: string }> = [
  { key: "submitted", label: "Filed" },
  { key: "under_review", label: "Under review" },
  { key: "investigating", label: "Investigating" },
  { key: "action_taken", label: "Action taken" },
  { key: "closed", label: "Closed" },
];
// "referred" is a side-track (sent to a higher authority), not a stage in the
// linear chain — it shows as its own state.
function stepIndex(status: string): number {
  const i = STATUS_CHAIN.findIndex((s) => s.key === status);
  return i; // -1 when "referred" (handled separately)
}

function StatusTracker({ status }: { status: string }) {
  if (status === "referred") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 text-violet-600 px-2.5 py-1 text-xs font-medium">
        <GitBranch className="h-3.5 w-3.5" /> Referred to higher authority
      </span>
    );
  }
  const idx = stepIndex(status);
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {STATUS_CHAIN.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const current = idx === i;
        const cls = done
          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
          : current
            ? "bg-action-primary/15 text-action-primary border-action-primary/40"
            : "bg-bg-elevated text-text-muted border-border";
        return (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
            >
              {done && <CheckCircle2 className="h-3 w-3" />}
              {current && <Loader2 className="h-3 w-3 animate-spin" />}
              {s.label}
            </span>
            {i < STATUS_CHAIN.length - 1 && (
              <span className="h-px w-3 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function CaseCard({ c }: { c: AntiRaggingCase }) {
  return (
    <div className="surface-card bg-bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="h-4 w-4 shrink-0 text-action-danger" />
          <span className="font-mono text-sm font-semibold text-text-primary">
            {c.caseNumber}
          </span>
          <span className="text-xs text-text-muted uppercase">
            {c.category}
          </span>
          {c.isAnonymous && (
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">
              anonymous
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted">
          {new Date(c.createdAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <StatusTracker status={c.status} />

      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <UserCog className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-text-muted">Assigned to</span>
          <span className="font-medium text-text-primary">
            {c.assignedToName || (c.assignedTo ? "A reviewer" : "Not yet assigned")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-text-muted">Last updated</span>
          <span className="font-medium text-text-primary">
            {new Date(c.updatedAt).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {c.committeeNotes && (
        <div className="rounded-lg border border-border bg-background p-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5 text-text-muted mb-1">
            <FileCheck className="h-3.5 w-3.5" /> Committee note
          </div>
          <p className="whitespace-pre-wrap">{c.committeeNotes}</p>
        </div>
      )}
    </div>
  );
}

export function AntiRaggingProgress() {
  const [cases, setCases] = useState<AntiRaggingCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/anti-ragging/cases", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success && Array.isArray(j.data?.cases)) setCases(j.data.cases);
        else setError(j.error?.message ?? "Could not load your cases");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your cases");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
        Progress unavailable: {error}
      </div>
    );
  }
  if (cases === null) {
    return (
      <div className="surface-card bg-bg-surface p-4 flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your cases…
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Your anti-ragging case progress">
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 text-action-primary" />
        <h2 className="text-sm font-semibold text-primary">
          Your case progress{" "}
          <span className="text-text-muted font-normal">
            ({cases.length} {cases.length === 1 ? "case" : "cases"})
          </span>
        </h2>
      </div>

      {cases.length === 0 ? (
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          No cases on file yet. When you file a report, its status and who it
          was assigned to will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </section>
  );
}
