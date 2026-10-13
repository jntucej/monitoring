"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
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
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
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
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Back to Mess Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRaiseOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Raise Issue
        </button>
      </div>

      {error && (
        <WidgetError message={`Issues feed unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      {raiseOpen && (
        <WidgetBoundary title="Raise Mess Issue">
          <form
            onSubmit={raiseIssue}
            className="rounded-xl border border-slate-800 bg-[#111827] p-4 space-y-3 min-w-0"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Issue type
                </span>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="NO_SHOW_FLAGGED">No-show flagged</option>
                  <option value="TOKEN_REVOKED">Token revoked</option>
                  <option value="MESS_INCIDENT">Mess incident</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What happened, when, and who is affected?"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 min-w-0"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={raising || !description.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white transition"
              >
                {raising ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Raise Issue
              </button>
              <button
                type="button"
                onClick={() => setRaiseOpen(false)}
                className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </WidgetBoundary>
      )}

      <WidgetBoundary title="Mess Issues">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <BellRing className="w-4 h-4 text-amber-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Mess Issues Feed</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {issuesRes?.data?.total ?? 0} event(s)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading issues feed…
            </div>
          ) : issues.length > 0 ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Event</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Meal Date</th>
                    <th className="text-left px-4 py-2.5">Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 min-w-0">
                        <p className="text-slate-200 font-medium capitalize truncate">
                          {issue.eventType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {issue.userName ? `${issue.userName} · ` : ""}
                          {issue.channel.toLowerCase()}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                            issue.status === "SENT"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                              : "border-slate-600/40 bg-slate-700/20 text-slate-400"
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                        {issue.mealDate ? fmtTs(issue.mealDate) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                        {fmtTs(issue.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No mess issues or exception events recorded. No-show flags, token revocations,
                and raised incidents will appear here.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
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
