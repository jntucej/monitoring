"use client";

/**
 * AssignmentsCard — a faculty "My assignments" summary card (Flow B).
 *
 * Lists the faculty's own assignments with submitted/total counts + a
 * "needs confirmation" flag (pending > 0), so the real pain point — "are all
 * done?" — is one glance on the faculty dashboard instead of 40 individual
 * checks. Each row links into the class detail (faculty/class/[id]) where the
 * confirm-complete + bulk-grade affordances live. Gated by the
 * `assignment.view` capability (renders nothing unless the role grants it).
 */

import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ListChecks, CircleCheck, Clock } from "lucide-react";
import Link from "next/link";
import { AssignmentConfirmationBar } from "@/components/nav/AssignmentConfirmationBar";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

interface AssignmentRow {
  id: string;
  classId: string;
  title: string;
  dueAt: string;
  submitted: number;
  total: number;
}
interface AssignmentsResp {
  data: { assignments: AssignmentRow[] };
}

function AssignmentsCardInner() {
  const role = useAuthStore((s) => s.user?.role);
  const addToast = useUIStore((s) => s.addToast);
  const { data, error, loading } = useApiResource<AssignmentsResp>(
    "/api/assignments?scope=faculty",
    { ttlMs: 300_000 },
  );
  const rows = data?.data?.assignments ?? [];
  const open = rows.filter((r) => r.submitted < r.total).length;

  if (loading) {
    return (
      <WidgetBoundary name="AssignmentsCard" title="My assignments" capability="assignment.view">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error) {
    return (
      <WidgetBoundary name="AssignmentsCard" title="My assignments" capability="assignment.view">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          Assignments unavailable{error ? `: ${String(error)}` : ""}.
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary name="AssignmentsCard" title="My assignments" capability="assignment.view">
      <div className="surface-card bg-bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-action-primary" />
            <h3 className="text-sm font-semibold text-text-primary">My assignments</h3>
          </div>
          {open > 0 && (
            <span className="text-xs text-amber-500">{open} needs confirmation</span>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">
            No assignments yet. Create one from your class view.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 6).map((a) => {
              const done = a.submitted >= a.total;
              return (
                <div key={a.id} className="space-y-2">
                  <Link
                    href={`/faculty/class/${a.classId}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-bg-elevated p-2.5 hover:bg-bg-elevated/70"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{a.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="h-3 w-3" />
                        Due {new Date(a.dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500">
                          <CircleCheck className="h-3.5 w-3.5" /> {a.submitted}/{a.total}
                        </span>
                      ) : (
                        <span className="text-text-muted tabular-nums">
                          {a.submitted}/{a.total} submitted
                        </span>
                      )}
                    </div>
                  </Link>
                  <AssignmentConfirmationBar
                    assignment={{
                      id: a.id,
                      title: a.title,
                      dueDate: new Date(a.dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
                      verifiedByFaculty: done,
                    }}
                    role={role ?? "faculty"}
                    onAction={(act, note) => {
                      addToast({
                        message: `${act.label} recorded for ${a.title}${note ? `: ${note}` : ""}`,
                        variant: "success",
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export function AssignmentsCard() {
  return <AssignmentsCardInner />;
}
