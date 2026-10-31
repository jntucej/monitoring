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
  Wrench,
  Send,
  Loader2,
  AlertTriangle,
  Inbox,
  CheckCircle2,
  Plus,
} from "lucide-react";

interface OperationalRequest {
  id: string;
  createdAt: string;
  raisedBy: string | null;
  category: string;
  title: string;
  priority: string;
  description: string | null;
  status: string;
  resolvedAt: string | null;
  resolution: string | null;
}

interface OpRequestsResponse {
  success: boolean;
  data: {
    requests: OperationalRequest[];
    openCount: number;
    total: number;
  };
}

const CATEGORIES = ["supply", "equipment", "staffing", "hygiene", "other"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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
        className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function priorityBadge(p: string): string {
  if (p === "high") return "border-rose-400/30 bg-rose-400/10 text-rose-400";
  if (p === "medium") return "border-amber-400/30 bg-amber-400/10 text-amber-400";
  return "border-sky-400/30 bg-sky-400/10 text-sky-400";
}

function MessOperationalRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);
  const { addToast } = useUIStore();

  const {
    data: queue,
    loading,
    error,
    refresh,
  } = useApiResource<OpRequestsResponse>(
    "/api/mess/operational-requests?limit=25",
    { ttlMs: 30_000 }
  );

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("supply");
  const [priority, setPriority] = useState<string>("medium");
  const [description, setDescription] = useState("");

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !queue;
  const requests = queue?.data?.requests ?? [];
  const openCount = queue?.data?.openCount ?? 0;

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/mess/operational-requests", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          category,
          priority,
          description: description.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to raise request");
      }
      setFormOpen(false);
      setTitle("");
      setDescription("");
      addToast({
        variant: "success",
        title: "Request raised",
        message: "Operational request sent to caretaker / facilities authority.",
      });
      await refreshAll();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Could not raise request",
        message: err instanceof Error ? err.message : "Failed to raise operational request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex min-h-[44px] items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
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
          onClick={() => setFormOpen((o) => !o)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {formOpen ? "Close form" : "Raise Request"}
        </button>
      </div>

      {error && (
        <WidgetError
          message={`Operational requests unavailable: ${error}`}
          onRetry={() => void refreshAll()}
        />
      )}

      {/* Request form — mess in-charge raises requests to caretaker / facilities */}
      {formOpen && (
        <WidgetBoundary title="Raise Operational Request">
          <form
            onSubmit={submitRequest}
            className="rounded-xl border border-slate-800 bg-[#111827] p-4 space-y-3 min-w-0"
          >
            <p className="text-xs text-slate-500">
              Requests are routed to the caretaker / facilities authority via the approvals
              desk. Keep the title specific (e.g. “Grinder replacement for mess kitchen”).
            </p>
            <label className="block min-w-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Title
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water filter replacement for mess"
                className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 min-w-0"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Priority
                </span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block min-w-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Details
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Context, affected area, urgency notes (optional)"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 min-w-0"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white transition"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Request
              </button>
            </div>
          </form>
        </WidgetBoundary>
      )}

      {/* Queue */}
      <WidgetBoundary title="Operational Requests">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Mess Operational Requests
            </span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {openCount} open
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading operational requests…
            </div>
          ) : requests.length > 0 ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Request</th>
                    <th className="text-left px-4 py-2.5">Category</th>
                    <th className="text-left px-4 py-2.5">Priority</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 min-w-0 max-w-md">
                        <p className="text-slate-200 font-medium truncate">{r.title}</p>
                        {r.description ? (
                          <p className="text-xs text-slate-500 truncate">{r.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 capitalize whitespace-nowrap">
                        {r.category}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${priorityBadge(r.priority)}`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                            r.status === "OPEN"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                        {fmtTs(r.createdAt)}
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
                No operational requests yet. Raise one above to flag supply, equipment,
                staffing or hygiene items to the caretaker / facilities authority.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessOperationalRequestsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessOperationalRequestsInner />
    </Suspense>
  );
}
