"use client";

import { useCallback, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { InboxFilters } from "./useInboxData";

const STAGES = [
  "warden_or_principal",
  "principal",
  "vice_principal",
  "deputy_warden",
  "hostel_manager",
] as const;

const WORKFLOWS = ["hostel", "exam", "gate", "memo", "staff_leave"] as const;
const SLA_OPTIONS = ["all", "overdue", "due-soon", "ok"] as const;

/**
 * InboxFilters — 3-row filter bar synced to URL search params.
 * Row 1: stage
 * Row 2: workflow type
 * Row 3: SLA status
 */
export function InboxFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stage = searchParams.get("stage") ?? "";
  const workflowType = searchParams.get("workflowType") ?? "";
  const sla = searchParams.get("sla") ?? "all";
  const status = searchParams.get("status") ?? "PENDING";
  const search = searchParams.get("q") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [searchParams, router],
  );

  const filters: InboxFilters = useMemo(
    () => ({
      stage: stage || undefined,
      workflowType: workflowType || undefined,
      sla: (sla === "all" ? undefined : (sla as InboxFilters["sla"])) as InboxFilters["sla"],
      status: status || undefined,
    }),
    [stage, workflowType, sla, status],
  );

  const hasActiveFilters = !!(stage || workflowType || sla !== "all" || search);

  return (
    <div className="space-y-2 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)] min-w-0">
      {/* Row 1: Stage */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        <span className="text-xs text-[var(--text-muted)] shrink-0">Stage:</span>
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          <button
            type="button"
            onClick={() => updateParam("stage", "")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
              !stage
                ? "bg-[var(--action-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            All
          </button>
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateParam("stage", s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                stage === s
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {s === "warden_or_principal" ? "Warden / Principal" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Workflow type */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        <span className="text-xs text-[var(--text-muted)] shrink-0">Workflow:</span>
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          <button
            type="button"
            onClick={() => updateParam("workflowType", "")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
              !workflowType
                ? "bg-[var(--action-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            All
          </button>
          {WORKFLOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateParam("workflowType", w)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                workflowType === w
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {w.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: SLA + search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="text-xs text-[var(--text-muted)] shrink-0">SLA:</span>
          <div className="flex items-center gap-1">
            {SLA_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateParam("sla", s === "all" ? "" : s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  (s === "all" && !sla) || sla === s
                    ? "bg-[var(--action-primary)] text-white"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                {s === "all" ? "All" : s === "overdue" ? "Overdue" : s === "due-soon" ? "Due soon" : "On track"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 sm:w-48">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => updateParam("q", e.target.value)}
              placeholder="Search name, roll, ticket..."
              className="pl-8 py-1.5 text-xs h-8"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => router.push(window.location.pathname, { scroll: false })}
              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper: extract InboxFilters from current searchParams. */
export function filtersFromParams(params: URLSearchParams): InboxFilters {
  return {
    stage: params.get("stage") || undefined,
    workflowType: params.get("workflowType") || undefined,
    sla: (params.get("sla") || undefined) as InboxFilters["sla"],
    status: params.get("status") || "PENDING",
  };
}
