"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  BookOpen,
  AlertTriangle,
  User,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getAuthHeaders } from "@/lib/utils";
import { getKnowledgeCentre, type KnowledgeDoc } from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CampusKnowledgeCentre() {
  const { user, role } = useAuthStore();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const CAN_REPORT = ["admin", "sysadmin", "supervisor", "hostel_manager", "hod", "principal", "vice_principal"].includes(
    role ?? ""
  );

  const load = useCallback(
    async (cat?: string, searchStr?: string) => {
      if (!user) return;
      setLoading(true);
      try {
        const result = await getKnowledgeCentre(cat, searchStr);
        if (result.success) {
          setDocs(result.data.docs);
          setCategories(result.data.categories);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    load(activeCategory, search);
  }, [activeCategory, load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => load(activeCategory, search), 300);
    return () => clearTimeout(t);
  }, [search, activeCategory, load]);  

  const reportOutdated = useCallback(
    async (docId: string) => {
      if (!user || !CAN_REPORT) return;
      try {
        const headers = getAuthHeaders();
        await fetch(
          `/api/campus-extra/knowledge?doc_id=${encodeURIComponent(
            docId
          )}&reason=Reported as outdated`,
          { method: "POST", headers }
        );
        // Refresh
        load(activeCategory);
      } catch {
        // Silently ignore
      }
    },
    [user, CAN_REPORT, activeCategory, load]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, docs.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        setSelectedDoc(docs[activeIndex]);
      }
    },
    [docs, activeIndex]
  );

  return (
    <WidgetBoundary title="Campus Knowledge Centre">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-slate-100">Knowledge Centre</h3>
          <span className="text-xs text-slate-500 ml-auto">
            {docs.length} document(s)
          </span>
        </div>

        {/* Search + Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="search"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              aria-label="Search knowledge documents"
            />
          </div>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="h-32 animate-pulse rounded bg-slate-700/20" />
        ) : docs.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No documents found. Documents are published by campus administrators.
          </p>
        ) : (
          <div
            ref={listRef}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className="space-y-2 max-h-80 overflow-y-auto outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/40 rounded"
            role="listbox"
            aria-label="Knowledge documents"
          >
            {docs.map((doc, i) => (
              <button
                key={doc.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => {
                  setActiveIndex(i);
                  setSelectedDoc(doc);
                }}
                className={`w-full text-left rounded-lg border p-3 transition-colors motion-reduce:transition-none ${
                  selectedDoc?.id === doc.id
                    ? "border-indigo-500/50 bg-indigo-500/10"
                    : i === activeIndex
                    ? "border-slate-500/50 bg-slate-700/30"
                    : "border-slate-700/40 bg-slate-800/30 hover:bg-slate-700/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {doc.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="rounded bg-slate-700/50 px-1.5 py-0.5 capitalize">
                        {doc.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.ownerRole}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                      <span>v{doc.version}</span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                </div>

                {selectedDoc?.id === doc.id && (
                  <div className="mt-2 text-[11px] text-slate-400 whitespace-pre-line line-clamp-4">
                    {doc.body}
                  </div>
                )}

                {selectedDoc?.id === doc.id && CAN_REPORT && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reportOutdated(doc.id);
                      }}
                      className="flex items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/20 transition-colors motion-reduce:transition-none"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Report as outdated
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default CampusKnowledgeCentre;
