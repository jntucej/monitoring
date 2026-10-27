"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCw,
  FileEdit,
  Clock,
  ChevronRight,
  X,
  ListPlus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useTaskDraftStore, hydrateTaskDraftsFromServer, type TaskDraftEntry } from "@/stores/taskDraftStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getTaskDrafts, saveTaskDraft, deleteTaskDraft } from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Draft type labels                                                   */
/* ------------------------------------------------------------------ */

const DRAFT_TYPE_LABELS: Record<string, string> = {
  request_draft: "Request Draft",
  event_registration: "Event Registration",
  approval_queue: "Approval Queue Position",
  incident: "Incident",
  draft_announcement: "Draft Announcement",
  search_filters: "Search Filters",
};

function getDraftLabel(draft: TaskDraftEntry): string {
  const label = DRAFT_TYPE_LABELS[draft.taskType] ?? draft.taskType;
  const extra =
    typeof draft.payload?.subject === "string"
      ? `: ${draft.payload.subject}`
      : typeof draft.payload?.title === "string"
      ? `: ${draft.payload.title}`
      : "";
  return label + extra;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function TaskContinuity() {
  const { user } = useAuthStore();
  const localDrafts = useTaskDraftStore((s) => s.drafts);
  const [serverDrafts, setServerDrafts] = useState<TaskDraftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Hydrate local from server first
      await hydrateTaskDraftsFromServer();

      // Also fetch fresh from server
      const result = await getTaskDrafts();
      if (result.success) {
        setServerDrafts(
          result.data.drafts.map((d) => ({
            taskType: d.taskType as TaskDraftEntry["taskType"],
            payload: d.payload,
            position: d.position,
            updatedAt: d.updatedAt,
          }))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const allDrafts = useMemo(() => {
    // Merge: prefer local (fresh), add server-only entries
    const localKeys = new Set(
      localDrafts.map((d) => `${d.taskType}:${d.position}`)
    );
    const serverOnly = serverDrafts.filter(
      (d) => !localKeys.has(`${d.taskType}:${d.position}`)
    );
    return [...localDrafts, ...serverOnly];
  }, [localDrafts, serverDrafts]);

  const handleResume = useCallback(
    (draft: TaskDraftEntry) => {
      // Navigate to the relevant page based on task type
      const base =
        draft.taskType === "request_draft"
          ? "/approver"
          : draft.taskType === "event_registration"
          ? "/campus"
          : draft.taskType === "approval_queue"
          ? "/approver"
          : draft.taskType === "incident"
          ? "/admin"
          : draft.taskType === "draft_announcement"
          ? "/admin"
          : "/";

      // Store the draft payload in sessionStorage for the target page to pick up
      try {
        sessionStorage.setItem(
          `resume-draft-${draft.taskType}`,
          JSON.stringify(draft.payload)
        );
      } catch {
        // Silently ignore
      }

      // Navigate — use window.location to avoid router dependency
      window.location.assign(base);
    },
    []
  );

  const handleDismiss = useCallback(
    async (draft: TaskDraftEntry) => {
      try {
        // Remove locally
        useTaskDraftStore.getState().removeDraft(draft.taskType, draft.position);
        // Also remove from server (best effort)
        const raw =
          sessionStorage.getItem("gate-monitor-auth") ??
          localStorage.getItem("gate-monitor-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.state?.token;
          if (token) {
            const res = await fetch(
              "/api/campus-extra/task-drafts",
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            // Silently ignore
          }
        }
      } catch {
        // Silently ignore
      }
    },
    []
  );

  // Group drafts by type for display
  const grouped = useMemo(() => {
    const map: Record<string, TaskDraftEntry[]> = {};
    for (const d of allDrafts) {
      if (!map[d.taskType]) map[d.taskType] = [];
      map[d.taskType].push(d);
    }
    return map;
  }, [allDrafts]);

  const hasDrafts = allDrafts.length > 0;

  return (
    <WidgetBoundary title="Task Continuity">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <RotateCw className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-medium text-slate-100">Resume Where You Left Off</h3>
          {hasDrafts && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
              {allDrafts.length} draft(s)
            </span>
          )}
        </div>

        {/* Resume Banner */}
        {hasDrafts && (
          <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
            <p className="text-xs text-violet-200 mb-1">
              You have unfinished work waiting. Pick up where you left off:
            </p>
            <ul className="space-y-1">
              {allDrafts.slice(0, 3).map((d, i) => (
                <li key={i} className="text-[11px] text-violet-300/80 truncate">
                  • {getDraftLabel(d)}
                  {d.updatedAt && (
                    <span className="text-violet-400/50 ml-1">
                      ({new Date(d.updatedAt).toLocaleDateString()})
                    </span>
                  )}
                </li>
              ))}
              {allDrafts.length > 3 && (
                <li className="text-[11px] text-violet-400/50">
                  +{allDrafts.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Draft List */}
        {loading ? (
          <div className="h-20 animate-pulse rounded bg-slate-700/20" />
        ) : !hasDrafts ? (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-500">
              No saved drafts. In-progress tasks will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {Object.entries(grouped).map(([type, drafts]) => (
              <div key={type}>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <ListPlus className="h-3 w-3" />
                  {DRAFT_TYPE_LABELS[type] ?? type}
                </p>
                {drafts.map((draft, i) => (
                  <div
                    key={`${draft.taskType}-${i}`}
                    className={`rounded-lg border p-3 mb-1.5 ${
                      expanded === `${draft.taskType}:${draft.position}`
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-slate-700/40 bg-slate-800/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(
                          expanded === `${draft.taskType}:${draft.position}`
                            ? null
                            : `${draft.taskType}:${draft.position}`
                        )
                      }
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span className="text-xs text-slate-200 flex-1 truncate">
                        {getDraftLabel(draft)}
                      </span>
                      {draft.updatedAt && (
                        <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(draft.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-slate-500 transition-transform motion-reduce:transition-none ${
                          expanded === `${draft.taskType}:${draft.position}`
                            ? "rotate-90"
                            : ""
                        }`}
                      />
                    </button>

                    {expanded === `${draft.taskType}:${draft.position}` && (
                      <div className="mt-2 space-y-2">
                        <div className="rounded bg-slate-900/50 p-2 text-[10px] text-slate-400 font-mono break-all max-h-24 overflow-y-auto">
                          {JSON.stringify(draft.payload, null, 2)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleResume(draft)}
                            className="flex items-center gap-1 rounded bg-violet-500/80 px-2.5 py-1 text-[10px] text-white hover:bg-violet-500 transition-colors motion-reduce:transition-none"
                          >
                            <RotateCw className="h-3 w-3" />
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismiss(draft)}
                            className="flex items-center gap-1 rounded border border-slate-600/50 px-2.5 py-1 text-[10px] text-slate-400 hover:bg-slate-700/40 transition-colors motion-reduce:transition-none"
                          >
                            <X className="h-3 w-3" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default TaskContinuity;
