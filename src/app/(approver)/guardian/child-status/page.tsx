"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { Person, Scan } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  GitBranch
} from "lucide-react";

/* ── pass-request timeline ── */

interface PassTimelineItem {
  id: string;
  passType: string;
  status: string;
  requestedAt: string;
  reason: string | null;
}

function PassTimeline({ wardRoll }: { wardRoll: string }) {
  const [items, setItems] = useState<PassTimelineItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wardRoll) return;
    setLoading(true);
    fetch(`/api/pass-requests?wardRoll=${encodeURIComponent(wardRoll)}&limit=5`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setItems((b?.data?.requests ?? []) as PassTimelineItem[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [wardRoll]);

  if (!wardRoll) return null;

  const tone = (status: string) => {
    const s = status.toUpperCase();
    if (["APPROVED"].includes(s)) return "ok";
    if (["REJECTED", "CANCELLED", "DISMISSED"].includes(s)) return "danger";
    if (["IN_PROGRESS"].includes(s)) return "warn";
    return "info";
  };

  return (
    <div className="surface-card bg-bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1.5 mb-3">
        <GitBranch className="w-3.5 h-3.5" /> Pass requests
      </p>
      {loading ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : items && items.length === 0 ? (
        <p className="text-xs text-text-muted">No pass requests yet.</p>
      ) : items && items.length > 0 ? (
        <ol className="relative border-l border-border ml-2 space-y-3">
          {items.map((it) => (
            <li key={it.id} className="ml-4">
              <span
                className={`absolute -left-1.5 size-4 rounded-full ring-4 ring-bg-surface ${
                  tone(it.status) === "ok" ? "bg-action-success" :
                  tone(it.status) === "danger" ? "bg-action-danger" :
                  tone(it.status) === "warn" ? "bg-action-warning" : "bg-action-info"
                }`}
              />
              <p className="text-sm text-text-primary">
                <span className="font-medium">{it.passType}</span>
                <span className="ml-2 text-xs uppercase text-text-muted">{it.status}</span>
              </p>
              {it.reason && <p className="text-xs text-text-muted mt-0.5">{it.reason}</p>}
              <p className="text-[11px] text-text-muted mt-0.5">
                {new Date(it.requestedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

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
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${
          isIn ? "bg-action-success/15 text-action-success" : "bg-action-danger/15 text-action-danger"
        }`}
      >
        {isIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
        {isIn ? "On campus" : "Off campus"}
      </span>
    </div>
  );
}

/* ── recent gate activity feed ── */

function ActivityFeed({ activities, wardName }: { activities: Scan[]; wardName: string | null }) {
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
          return (
            <div key={a.id} className="flex items-center justify-between gap-3">
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
            </div>
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
  const [activity, setActivity] = useState<Scan[]>([]);
  const [activityWard, setActivityWard] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    if (wards.length === 0) {
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    const next: Record<string, PersonStatus> = {};
    await Promise.all(
      wards.map(async (w) => {
        const roll = w.uniqueId || w.roll || "";
        if (!roll) return;
        try {
          const res = await fetch(`/api/persons/${encodeURIComponent(roll)}`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          });
          const json = await res.json();
          next[roll] = json?.data?.campusStatus
            ? {
                campusStatus: json.data.campusStatus,
                lastScan: json.data.lastScan ?? null,
              }
            : { campusStatus: "OUT", lastScan: null };
        } catch {
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
          const json = await res.json();
          setActivity(Array.isArray(json?.data?.history) ? json.data.history : []);
        } catch {
          setActivity([]);
        }
      }
    }
    setStatusLoading(false);
  }, [wards]);

  useEffect(() => {
    if (!personsLoading) void loadStatuses();
  }, [personsLoading, loadStatuses]);

  usePolling(loadStatuses, { intervalMs: 30_000, enabled: !!userId && wards.length > 0 });

  const anyLoading = personsLoading || statusLoading;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-action-success" />
          Child Status
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Where your wards are right now and their recent gate activity
        </p>
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
            className="surface-card inline-flex items-center gap-1.5 bg-action-danger/20 px-3 py-1.5 text-xs font-semibold text-action-danger hover:bg-action-danger/30"
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
        <div className="surface-card bg-bg-base/60 p-8 text-center text-sm text-text-muted">
          No wards linked to your account yet.
        </div>
      ) : (
        <div className="space-y-3">
          {wards.map((w) => {
            const roll = w.uniqueId || w.roll || "";
            const st = roll ? statuses[roll] : null;
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
                <WardStatusCard ward={w} status={st} />
              </HoverPreview>
            );
          })}
        </div>
      )}

      <WidgetBoundary title="Recent Gate Activity">
        <div className="surface-card bg-bg-surface p-4">
          <ActivityFeed activities={activity} wardName={activityWard} />
        </div>
      </WidgetBoundary>
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
