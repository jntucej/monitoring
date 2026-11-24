"use client";

import React from "react";
import {
  MapPin,
  Clock,
  UserCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  resolvePostCoverageAndAlerts,
  type GuardPostAssignment,
  type LocationIncidentAlert,
} from "@/lib/security-post-dispatch";

export function PostTimetableBoard({
  assignments,
  incidents,
  onReassignPost,
}: {
  assignments: GuardPostAssignment[];
  incidents: LocationIncidentAlert[];
  onReassignPost?: (postId: string) => void;
}) {
  const posts = resolvePostCoverageAndAlerts(assignments, incidents);

  return (
    <section data-testid="supervisor-post-timetable" className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {posts.map((post) => (
          <div
            key={post.postId}
            className={`surface-card bg-bg-surface p-4 space-y-3 ${
              post.uncovered || post.openIncidents.length > 0
                ? "border-amber-500/60"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-text-primary">
                  <MapPin className="h-4 w-4 text-action-primary" />
                  <span>{post.postName}</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {post.activeGuardsCount} on post • {post.dispatchedCount}{" "}
                  responding
                </p>
              </div>

              {post.uncovered ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-action-danger">
                  <AlertTriangle className="h-3 w-3" /> Uncovered
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-action-success">
                  <UserCheck className="h-3 w-3" /> Covered
                </span>
              )}
            </div>

            <div className="space-y-2">
              {post.guards.length === 0 ? (
                <p className="text-xs text-text-muted italic">
                  No guard scheduled at this post for the current window.
                </p>
              ) : (
                post.guards.map((g) => (
                  <div
                    key={g.assignmentId}
                    className="surface-card bg-bg-elevated/50 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-text-primary">
                        {g.guardName}
                      </p>
                      <p className="text-[11px] text-text-muted inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {g.shiftLabel} •{" "}
                        {g.roleAtPost}
                      </p>
                    </div>
                    <span className="shrink-0 surface-card bg-bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-text-primary">
                      {g.dutyStatus}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border text-xs">
              <span className="text-text-muted">
                {post.openIncidents.length > 0
                  ? `${post.openIncidents.length} active alert(s) here`
                  : "No open alerts"}
              </span>

              {onReassignPost && (
                <button
                  type="button"
                  onClick={() => onReassignPost(post.postId)}
                  className="surface-card inline-flex items-center gap-1 bg-bg-elevated px-2.5 py-1 font-medium text-text-primary hover:bg-bg-surface"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Assign / Cover</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
