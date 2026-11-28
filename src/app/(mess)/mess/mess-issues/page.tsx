"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import {
  BellRing,
  Plus,
  Loader2,
  AlertTriangle,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { KVPairs, ActionRow, InspectorButton } from "@/components/shared/EntityInspector";
import { FrontlineSubjectSheet } from "@/components/nav/level1/FrontlinePivot";
import type { FrontlineSubject } from "@/components/nav/level1/FrontlinePivot";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface MessIssue {
  id: string;
  eventType: string;
  channel: string;
  status: string;
  userName: string | null;
  mealDate: string | null;
  payload: Record<string, unknown> | null;
  sentAt: string | null;
  createdAt: string;
}

interface IssuesResponse {
  success: boolean;
  data: {
    issues: MessIssue[];
    total: number;
  };
}

function issueInspection(i: MessIssue) {
  const sent = i.status === "SENT";
  return {
    kind: "incident",
    title: i.eventType.replace(/_/g, " "),
    subtitle: i.id,
    status: (
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
          sent ? "bg-emerald-500/10 text-action-success" : "bg-bg-elevated text-text-muted"
        }`}
      >
        {i.status}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Event", value: i.eventType.replace(/_/g, " ") },
              { label: "Channel", value: i.channel },
              { label: "User", value: i.userName ?? "—" },
              { label: "Meal date", value: i.mealDate ?? "—" },
              { label: "Raised", value: i.createdAt ? new Date(i.createdAt).toLocaleString("en-IN") : "—" },
              { label: "Sent", value: i.sentAt ? new Date(i.sentAt).toLocaleString("en-IN") : "Pending" },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/mess/mess-issues" variant="ghost">
              All issues
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/mess/mess-issues",
    detailLabel: "All issues",
  };
}

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="surface-card min-h-11 inline-flex items-center justify-center px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function MessIssuesInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);
  const { addToast } = useUIStore();
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const {
    data: issuesRes,
    loading,
    error,
    refresh,
  } = useApiResource<IssuesResponse>("/api/mess/issues?limit=20", { ttlMs: 30_000 });

  const [raising, setRaising] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [eventType, setEventType] = useState("NO_SHOW_FLAGGED");
  const [description, setDescription] = useState("");
  // L1 FrontlinePivot: duty-scoped subject sheet.
  const [frontlineSubject, setFrontlineSubject] = useState<FrontlineSubject | null>(null);

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !issuesRes;
  const issues = issuesRes?.data?.issues ?? [];

  const raiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (raising || !description.trim()) return;
    setRaising(true);
    try {
      const res = await fetch("/api/mess/issues", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ eventType, description: description.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to raise issue");
      }
      setRaiseOpen(false);
      setDescription("");
      addToast({ variant: "success", title: "Issue raised", message: "Logged to the audit trail." });
      await refreshAll();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not raise issue",
        message: err instanceof Error ? err.message : "Failed to raise issue",
      });
    } finally {
      setRaising(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex min-h-11 items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Back to Mess Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRaiseOpen((o) => !o)}
          className="surface-card inline-flex min-h-11 items-center gap-2 bg-emerald-500/10 px-4 py-2 text-sm text-action-success hover:bg-emerald-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Raise Issue
        </button>
      </div>

      <ContextSituationBar
        roleLabel="Mess In-Charge"
        purpose="Log mess incidents, flag student dining no-shows or token revocations, and audit audit trail entries"
        contextLabel={`Mess Issues & Incident Audit · ${issuesRes?.data?.total ?? 0} Events`}
        statusSummary={
          (issuesRes?.data?.total ?? 0) > 0
            ? `${issuesRes?.data?.total ?? 0} mess issue event${issuesRes?.data?.total === 1 ? "" : "s"} logged. Review flagged no-shows and token exceptions.`
            : "No mess exception issues or incidents recorded. Logging is operational."
        }
        why="Documenting dining discrepancies, hygiene feedback, and broken meal tokens provides transparent records for warden reviews."
        severity="info"
        primaryAction={{ label: "Operational Requests", href: "/mess/operational-requests" }}
        secondaryActions={[
          { label: "Token Scanner", href: "/mess/scan" },
          { label: "Reviews", href: "/mess/reviews" },
          { label: "Mess Overview", href: "/mess" },
        ]}
      />

      {error && (
        <WidgetError message={`Issues feed unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      {raiseOpen && (
        <WidgetBoundary title="Raise Mess Issue">
          <form
            onSubmit={raiseIssue}
            className="surface-card bg-bg-base p-4 space-y-3 min-w-0"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Issue type
                </span>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="surface-card mt-1 w-full min-h-11 bg-bg-surface px-3 py-2 text-sm text-white focus:outline-none focus:"
                >
                  <option value="NO_SHOW_FLAGGED">No-show flagged</option>
                  <option value="TOKEN_REVOKED">Token revoked</option>
                  <option value="MESS_INCIDENT">Mess incident</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What happened, when, and who is affected?"
                  className="surface-card mt-1 w-full bg-bg-surface px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus: min-w-0"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={raising || !description.trim()}
                className="surface-card inline-flex min-h-11 items-center gap-2 bg-action-success hover:bg-action-success disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white transition"
              >
                {raising ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Raise Issue
              </button>
              <button
                type="button"
                onClick={() => setRaiseOpen(false)}
                className="surface-card inline-flex min-h-11 items-center px-3 py-2 text-xs text-text-muted hover:bg-bg-elevated"
              >
                Cancel
              </button>
            </div>
          </form>
        </WidgetBoundary>
      )}

      <WidgetBoundary title="Mess Issues">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex items-center gap-2 min-w-0">
            <BellRing className="w-4 h-4 text-amber-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Mess Issues Feed</span>
            <span className="ml-auto text-xs text-text-muted shrink-0">
              {issuesRes?.data?.total ?? 0} event(s)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading issues feed…
            </div>
          ) : issues.length > 0 ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w140">
                <thead>
                  <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Event</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Meal Date</th>
                    <th className="text-left px-4 py-2.5">Raised</th>
                    <th className="text-left px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-bg-elevated/30 transition-colors cursor-pointer" onClick={() => inspect(issueInspection(issue))}>
                      <td className="px-4 py-2.5 min-w-0">
                        <p className="text-text-secondary font-medium capitalize truncate">
                          {issue.eventType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {issue.userName ? `${issue.userName} · ` : ""}
                          {issue.channel.toLowerCase()}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                            issue.status === "SENT"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-action-success"
                              : "border-border/40 bg-bg-elevated/20 text-text-muted"
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                        {issue.mealDate ? fmtTs(issue.mealDate) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted text-xs whitespace-nowrap">
                        {fmtTs(issue.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFrontlineSubject({
                              id: issue.id,
                              name: issue.eventType.replace(/_/g, " "),
                              code: issue.channel || issue.eventType.replace(/_/g, " "),
                              statusTag: issue.status,
                              locationOrScope: issue.channel,
                            });
                          }}
                          className="surface-card min-h-11 px-2 py-0.5 text-xs font-semibold bg-bg-elevated text-text-secondary hover:bg-bg-surface transition-colors"
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted max-w-md mx-auto">
                No mess issues or exception events recorded. No-show flags, token revocations,
                and raised incidents will appear here.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />

      {/* L1 FrontlinePivot: duty-scoped subject sheet */}
      <FrontlineSubjectSheet
        subject={frontlineSubject}
        onClose={() => setFrontlineSubject(null)}
      />
    </div>
  );
}

export default function MessIssuesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessIssuesInner />
    </Suspense>
  );
}
