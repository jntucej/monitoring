"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Clock,
  Loader2,
  FileText,
  AlertTriangle,
  ArrowRight,
  Search,
  ExternalLink,
  BookOpen,
} from "lucide-react";

/* /api/campus-extra/knowledge response shape */
interface KnowledgeDoc {
  id: string;
  category: string;
  title: string;
  body: string;
  ownerRole: string;
  updatedAt: string;
  version: number;
}

interface KnowledgeResponse {
  success: boolean;
  data: {
    docs: KnowledgeDoc[];
    categories: string[];
  };
}

function ExamBranchDocsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const [search, setSearch] = useState("");

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<KnowledgeResponse>(
    `/api/campus-extra/knowledge?search=${encodeURIComponent(search || "exam")}`,
    { ttlMs: 30_000, deps: [search] }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const docs = data?.data?.docs ?? [];
  const categories = data?.data?.categories ?? [];

  const examDocs = useMemo(() => {
    const all = docs;
    if (!search) return all;
    return all.filter(
      (d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.category.toLowerCase().includes("exam")
    );
  }, [docs, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Docs unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search + category filter */}
      <WidgetBoundary title="Documentation Filter">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exam documentation…"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                aria-label="Search exam documentation"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-xs text-slate-500 shrink-0">Categories:</span>
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 text-xs"
                >
                  {cat}
                </span>
              ))}
              {categories.length === 0 && (
                <span className="text-xs text-slate-600">none</span>
              )}
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {/* API docs link */}
      <WidgetBoundary title="API Documentation">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <ExternalLink className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                Gate Monitor API Reference
              </p>
              <p className="text-xs text-slate-500">
                OpenAPI 3.0 spec for all system endpoints
              </p>
            </div>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 shrink-0"
            >
              <ExternalLink className="w-3 h-3" /> Open
            </Link>
          </div>
        </div>
      </WidgetBoundary>

      {/* Exam documentation list */}
      <WidgetBoundary title="Examination Documentation">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Exam Branch Documentation
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {examDocs.length} document(s)
            </span>
          </div>

          {busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : examDocs.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                No exam documentation found.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Exam policy documents are published by authorised roles and
                appear here automatically. Try clearing the search or check
                with the OIE.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {examDocs.map((doc) => (
                <li key={doc.id} className="px-4 py-3 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-white min-w-0 flex-1 truncate">
                        {doc.title}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 text-xs shrink-0">
                        {doc.category}
                      </span>
                      <span className="text-xs text-slate-600 shrink-0">
                        v{doc.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 min-w-0 line-clamp-2">
                      {doc.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 min-w-0">
                      <span>Owner: {doc.ownerRole}</span>
                      <span>
                        Updated{" "}
                        {new Date(doc.updatedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchDocsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchDocsInner />
    </Suspense>
  );
}
