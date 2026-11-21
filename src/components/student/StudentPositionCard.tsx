"use client";

/**
 * StudentPositionCard — a position-aware panel for the student profile page.
 *
 * The profile should "vary according to the student's position": where they
 * live (hosteller vs day scholar) and where they are NOW (in-campus vs
 * out-campus). This card reads the live workspace context from
 * /api/me/workspace (the single source of truth — it queries
 * campus_occupancy on the server, which the client can't reach directly),
 * and renders a distinct panel per combination:
 *
 *   hosteller + in_campus  → "You're in your hostel" + active pass + return
 *   hosteller + out_campus → "You're out on a pass" + pass expiry + return action
 *   day_scholar + in_campus→ "You're on campus" (no hostel features)
 *   day_scholar + out_campus→ "You're at home / away"
 *   unknown                → "Live position unavailable" + retry
 *
 * No new enforcement — it is a presentation card that projects the live
 * context the resolver already computes. Read-only; it never mutates state.
 */

import React, { useEffect, useState } from "react";
import {
  MapPin,
  Building2,
  Home,
  Clock,
  KeyRound,
  LogOut as OutIcon,
  RefreshCw,
  DoorOpen,
  ShieldQuestion,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";

interface WorkspaceCtx {
  residentialStatus: "hosteller" | "day_scholar" | "n_a";
  campusStatus: "in_campus" | "out_campus" | "unknown";
  hostel: { blockId: string | null; roomId: string | null } | null;
  /** the person's roll / admission number (student_details.roll). */
  roll?: string | null;
  activeAuthorizations: Array<{
    kind: string;
    passType?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}

interface WorkspaceResponse {
  data: WorkspaceCtx & { personId?: string };
}

function positionCopy(ctx: WorkspaceCtx): {
  icon: React.ReactNode;
  headline: string;
  sub: string;
  accent: string;
} {
  const isHosteller = ctx.residentialStatus === "hosteller";
  const inCampus = ctx.campusStatus === "in_campus";
  const outCampus = ctx.campusStatus === "out_campus";
  const block = ctx.hostel?.blockId;
  const room = ctx.hostel?.roomId;

  if (ctx.campusStatus === "unknown") {
    return {
      icon: <ShieldQuestion className="h-5 w-5" />,
      headline: "Live position unavailable",
      sub: "We couldn't read your current campus status. Refresh to retry.",
      accent: "amber",
    };
  }

  if (isHosteller && inCampus) {
    return {
      icon: <Building2 className="h-5 w-5" />,
      headline: "You're in your hostel",
      sub: block
        ? `Block ${block}${room ? ` · Room ${room}` : ""} · residential`
        : "Residential · on campus",
      accent: "emerald",
    };
  }
  if (isHosteller && outCampus) {
    return {
      icon: <OutIcon className="h-5 w-5" />,
      headline: "You're out on a pass",
      sub: "You're away from the hostel. Your return deadline and pass status are below.",
      accent: "sky",
    };
  }
  if (ctx.residentialStatus === "day_scholar" && inCampus) {
    return {
      icon: <MapPin className="h-5 w-5" />,
      headline: "You're on campus",
      sub: "Day scholar · present on campus",
      accent: "emerald",
    };
  }
  // day_scholar + out_campus (or any remaining combo)
  return {
    icon: <Home className="h-5 w-5" />,
    headline: "You're away from campus",
    sub: "Day scholar · off campus",
    accent: "violet",
  };
}

function StudentPositionCardInner() {
  const { data, error, loading, refresh } = useApiResource<WorkspaceResponse>(
    "/api/me/workspace",
    { ttlMs: 60_000, enabled: true },
  );
  const ctx = data?.data;

  const [showRetry, setShowRetry] = useState(false);
  useEffect(() => {
    setShowRetry(false);
  }, [ctx?.campusStatus]);

  if (loading) {
    return (
      <WidgetBoundary name="StudentPositionCard" title="Your Position">
        <PageLoading />
      </WidgetBoundary>
    );
  }

  if (error || !ctx) {
    return (
      <WidgetBoundary name="StudentPositionCard" title="Your Position">
        <div className="surface-card bg-bg-surface p-5 text-center space-y-3">
          <ShieldQuestion className="mx-auto h-6 w-6 text-text-muted" />
          <p className="text-sm text-text-secondary">
            Position unavailable{error ? `: ${String(error)}` : ""}
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mx-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </WidgetBoundary>
    );
  }

  const copy = positionCopy(ctx);
  const accentClasses: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    sky: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    violet: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  };
  const accent = accentClasses[copy.accent] ?? accentClasses.emerald;

  const hostelLeave = ctx.activeAuthorizations.find(
    (a) => a.kind === "hostel_leave" || a.passType === "hostel_leave" || a.passType === "outpass",
  );
  const returnDeadline = hostelLeave?.to;

  return (
    <WidgetBoundary name="StudentPositionCard" title="Your Position">
      <div className="surface-card bg-bg-surface p-5 space-y-4">
        {/* Headline position */}
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2.5 ${accent} border ${copy.accent === "amber" ? "" : "border-current/10"}`}
          >
            {copy.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{copy.headline}</h3>
            <p className="text-xs text-text-muted mt-0.5">{copy.sub}</p>
            {/* The roll / admission number — what the student actually knows
                themselves by (the profile previously showed the internal UUID). */}
            {ctx.roll && (
              <p className="mt-1.5 text-xs text-text-muted">
                Roll: <span className="font-mono font-semibold text-text-primary">{ctx.roll}</span>
              </p>
            )}
          </div>
        </div>

        {/* Live status chip */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${accent}`}
          >
            <Clock className="h-3 w-3" />
            {ctx.campusStatus === "in_campus"
              ? "On campus"
              : ctx.campusStatus === "out_campus"
                ? "Off campus"
                : "Position unknown"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-secondary">
            <KeyRound className="h-3 w-3" />
            {ctx.residentialStatus === "hosteller"
              ? "Hosteller"
              : ctx.residentialStatus === "day_scholar"
                ? "Day scholar"
                : "Not residential"}
          </span>
          <button
            type="button"
            onClick={() => setShowRetry((s) => !s)}
            className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
            aria-label="Refresh position"
          >
            <RefreshCw className="h-3.5 w-3.5" /> refresh
          </button>
        </div>

        {/* Position-specific detail */}
        {ctx.residentialStatus === "hosteller" && (
          <div className="rounded-lg border border-border bg-background p-3 text-xs text-text-secondary space-y-2">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-3.5 w-3.5 text-text-muted" />
              <span>
                {ctx.hostel?.blockId
                  ? `Residence: Block ${ctx.hostel.blockId}${ctx.hostel.roomId ? ` · Room ${ctx.hostel.roomId}` : ""}`
                  : "Residence: hostel (block not set)"}
              </span>
            </div>

            {ctx.campusStatus === "out_campus" && (
              <div className="space-y-1.5">
                {hostelLeave ? (
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Active pass · {hostelLeave.passType ?? hostelLeave.kind}</span>
                    {returnDeadline && (
                      <span className="font-medium text-text-primary">
                        Return by {new Date(returnDeadline).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-600">
                    No active pass found while off-campus — this may need supervisor review.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {showRetry && (
          <p className="text-xs text-text-muted">
            Live position updates on gate scans; a manual refresh re-reads your current status.
          </p>
        )}
      </div>
    </WidgetBoundary>
  );
}

export function StudentPositionCard() {
  return <StudentPositionCardInner />;
}
