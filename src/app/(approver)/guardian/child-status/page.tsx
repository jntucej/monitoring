"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WorkflowChainTracker } from "@/components/shared/WorkflowChainTracker";
import { useAuthStore } from "@/stores/authStore";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { Person, Scan } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  buildGuardianWardStatusInspection,
  buildGuardianScanActivityInspection,
} from "@/lib/role-registers/guardianInspections";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin
} from "lucide-react";

/* ── shapes ── */

interface PersonsResponse {
  success: boolean;
  data: Person[];
}

interface PersonStatus {
  campusStatus: string;
  lastScan: { timestamp: string; gateName: string } | null;
}





/* ── live status per ward ── */

function WardStatusCard({ ward, status }: { ward: Person; status: PersonStatus | null }) {
  const roll = ward.uniqueId || ward.roll || "";
  const name = ward.fullName || ward.name || "Unknown ward";
  const isIn = status?.campusStatus === "IN";
  const lastSeen = status?.lastScan
    ? `${status.lastScan.gateName} · ${new Date(status.lastScan.timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "No recent gate activity";

  return (
    <div className="surface-card bg-bg-surface p-4 flex items-center justify-between gap-3 flex-wrap min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative size-8 rounded-full border-2 border-border overflow-hidden shrink-0">
          {ward.photoUrl ? (
             
            <img src={ward.photoUrl} alt={name} className="rounded-full w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-action-success/20 text-action-success flex items-center justify-center text-lg font-semibold">
              {name?.[0] ?? "?"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
          <p className="text-xs font-mono text-text-muted">{roll || "—"}</p>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            <MapPin className="size-3.5" />
            {lastSeen}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isIn ? "bg-action-success/15 text-action-success" : "bg-action-danger/15 text-action-danger"
          }`}
        >
          {isIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {isIn ? "On campus" : "Off campus"}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/guardian/pass-leave-submission?wardId=${encodeURIComponent(ward.id)}`}
            className="min-h-11 inline-flex items-center rounded-lg bg-action-primary px-3 py-1.5 font-semibold text-white hover:opacity-90"
          >
            Submit Pass / Leave
          </Link>
          <Link
            href={`/guardian/movement-info?wardId=${encodeURIComponent(ward.id)}`}
            className="min-h-11 inline-flex items-center px-2 font-medium text-text-secondary hover:text-action-primary underline"
          >
            Movement
          </Link>
          <Link
            href={`/guardian/request-status?wardId=${encodeURIComponent(ward.id)}`}
            className="min-h-11 inline-flex items-center px-2 font-medium text-text-secondary hover:text-action-primary underline"
          >
            Requests
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── recent gate activity feed ── */

function ActivityFeed({
  activities,
  wardName,
  onInspectScan,
}: {
  activities: Scan[];
  wardName: string | null;
  onInspectScan?: (scan: Scan) => void;
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-text-muted">No recent gate activity recorded.</p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        {wardName ? `Recent gate activity for ${wardName}` : "Recent gate activity"}
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.map((a) => {
          const isIn = a.direction === "IN";
          const label = `${isIn ? "Entry" : "Exit"} at ${a.gateName}`;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onInspectScan?.(a)}
              aria-label={`Inspect ${label}`}
              className="w-full flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-bg-base/40 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
            >
              <div className={`flex items-center gap-2 text-sm ${isIn ? "text-action-success" : "text-action-danger"}`}>
                {isIn ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="font-medium">{isIn ? "Entry" : "Exit"}</span>
                <span className="text-text-muted text-xs">{a.gateName}</span>
              </div>
              <span className="text-xs text-text-muted shrink-0">
                {new Date(a.timestamp).toLocaleString("en-IN", {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── main page ── */

function ChildStatusInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  // Same fetch the parent /child page relies on: linked wards via parent id.
  const {
    data: persons,
    loading: personsLoading,
    error: personsError,
    refresh: refreshPersons,
  } = useApiResource<PersonsResponse>("/api/persons?parentId=me", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const wards: Person[] = persons?.data ?? [];

  // Live IN/OUT status + last scan per ward (same /api/persons/:roll source
  // the parent ChildStatus component polls).
  const [statuses, setStatuses] = useState<Record<string, PersonStatus>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Scan[]>([]);
  const [activityWard, setActivityWard] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    if (wards.length === 0) {
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    setStatusError(null);
    const next: Record<string, PersonStatus> = {};
    let hadError = false;
    await Promise.all(
      wards.map(async (w) => {
        const roll = w.uniqueId || w.roll || "";
        if (!roll) return;
        try {
          const res = await fetch(`/api/persons/${encodeURIComponent(roll)}`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          });
          if (!res.ok) hadError = true;
          const json = await res.json().catch(() => ({}));
          next[roll] = json?.data?.campusStatus
            ? {
                campusStatus: json.data.campusStatus,
                lastScan: json.data.lastScan ?? null,
              }
            : { campusStatus: "OUT", lastScan: null };
        } catch {
          hadError = true;
          next[roll] = { campusStatus: "OUT", lastScan: null };
        }
      })
    );
    setStatuses(next);

    // Activity feed for the first ward (mirrors parent/child behavior)
    const first = wards[0];
    if (first) {
      setActivityWard(first.fullName || first.name || null);
      const roll = first.uniqueId || first.roll || "";
      if (roll) {
        try {
          const res = await fetch(`/api/persons/${encodeURIComponent(roll)}/history?limit=10`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          });
          if (!res.ok) hadError = true;
          const json = await res.json().catch(() => ({}));
          setActivity(Array.isArray(json?.data?.history) ? json.data.history : []);
        } catch {
          hadError = true;
          setActivity([]);
        }
      }
    }
    if (hadError) {
      setStatusError("Some ward status or movement records could not be refreshed.");
    }
    setStatusLoading(false);
  }, [wards]);

  useEffect(() => {
    if (!personsLoading) void loadStatuses();
  }, [personsLoading, loadStatuses]);

  usePolling(loadStatuses, { intervalMs: 30_000, enabled: !!userId && wards.length > 0 });

  const anyLoading = personsLoading || statusLoading;

  const { inspection, inspect, closeInspection } = useEntityInspector();
  const openWardInspector = (w: Person, st: PersonStatus | null) =>
    inspect(buildGuardianWardStatusInspection(w, st));
  const openScanInspector = (s: Scan) =>
    inspect(buildGuardianScanActivityInspection(s, activityWard));

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-action-success" />
          Child Status
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Current campus presence and last known gate activity for your wards
        </p>
      </div>

      <ContextSituationBar
        roleLabel="Student Guardian / Parent"
        purpose="Monitor live campus presence, check-in state, and recent gate crossings for linked wards."
        why="Checking live presence gives families peace of mind by showing the exact gate and timestamp of their ward's last movement."
        contextLabel="Ward Campus Presence"
        statusTone="info"
        statusPill={`${wards.length} Ward${wards.length === 1 ? "" : "s"}`}
        statusSummary={
          wards.length > 0
            ? `Supervising ${wards.length} linked student(s). Click any ward card to inspect presence details.`
            : "No wards currently linked to your guardian account."
        }
        primaryAction={{ label: "Submit Pass / Leave", href: "/guardian/pass-leave-submission" }}
        secondaryAction={{ label: "Movement Records", href: "/guardian/movement-info" }}
      />
      <div className="surface-card bg-bg-surface p-3">
        <WorkflowChainTracker
          currentStage="guardian"
          ticketStatus={wards.length > 0 ? "APPROVED" : "PENDING"}
        />
      </div>

      {personsError && (
        <div className="surface-card bg-action-danger/10 p-3 text-sm text-action-danger flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Could not load wards.
          </span>
          <button
            type="button"
            onClick={() => void refreshPersons()}
            className="min-h-11 px-3 text-xs font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {statusError && (
        <div
          role="alert"
          aria-live="polite"
          className="surface-card bg-amber-500/10 p-3 text-xs text-action-warning flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {statusError}
          </span>
          <button
            type="button"
            onClick={() => void loadStatuses()}
            className="min-h-11 px-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {anyLoading ? (
        <div className="surface-card bg-bg-surface p-6 flex items-center gap-3 text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading ward status…
        </div>
      ) : wards.length === 0 ? (
        <div className="surface-card bg-bg-base/60 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-text-secondary">No Linked Wards</p>
          <p className="text-xs text-text-muted">No students are currently linked to your guardian account. Contact campus administration or submit a pass request.</p>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            <Link
              href="/guardian/contact-info"
              className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
            >
              Verify Contact Info
            </Link>
            <Link
              href="/guardian/pass-leave-submission"
              className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              Pass / Leave Submission
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {wards.map((w) => {
            const roll = w.uniqueId || w.roll || "";
            const st = roll ? statuses[roll] : null;
            const name = w.fullName || w.name || "Linked ward";
            return (
              <HoverPreview
                key={w.id}
                preview={
                  <MetricPreview
                    label={w.fullName ?? w.uniqueId}
                    value={st ? (st.campusStatus === "IN" ? "On campus" : st.campusStatus) : "—"}
                    hint={st?.lastScan ? `Last scan ${new Date(st.lastScan.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} at ${st.lastScan.gateName}` : "No scan recorded"}
                  />
                }
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openWardInspector(w, st)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openWardInspector(w, st);
                    }
                  }}
                  aria-label={`Inspect ward status for ${name}`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary rounded-xl"
                >
                  <WardStatusCard ward={w} status={st} />
                </div>
              </HoverPreview>
            );
          })}
        </div>
      )}

      <WidgetBoundary title="Recent Gate Activity">
        <div className="surface-card bg-bg-surface p-4">
          <ActivityFeed
            activities={activity}
            wardName={activityWard}
            onInspectScan={openScanInspector}
          />
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
export default function ChildStatusPage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ChildStatusInner />
      </Suspense>
    </AuthGuard>
  );
}
