"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { Person, Scan } from "@/lib/types";
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

interface ChildStatusInnerProps {
  wards: Person[];
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex items-center justify-between gap-3 flex-wrap min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-12 h-12 rounded-full border-2 border-[var(--border-strong)] overflow-hidden shrink-0">
          {ward.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ward.photoUrl} alt={name} className="rounded-full w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-semibold">
              {name?.[0] ?? "?"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{name}</p>
          <p className="text-xs font-mono text-[var(--text-muted)]">{roll || "—"}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {lastSeen}
          </p>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${
          isIn ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
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
      <p className="text-sm text-[var(--text-muted)]">No recent gate activity recorded.</p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)]">
        {wardName ? `Recent gate activity for ${wardName}` : "Recent gate activity"}
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.map((a) => {
          const isIn = a.direction === "IN";
          return (
            <div key={a.id} className="flex items-center justify-between gap-3">
              <div className={`flex items-center gap-2 text-sm ${isIn ? "text-emerald-400" : "text-rose-400"}`}>
                {isIn ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="font-medium">{isIn ? "Entry" : "Exit"}</span>
                <span className="text-[var(--text-muted)] text-xs">{a.gateName}</span>
              </div>
              <span className="text-xs text-[var(--text-muted)] shrink-0">
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
          <MapPin className="w-6 h-6 text-emerald-400" />
          Child Status
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Where your wards are right now and their recent gate activity
        </p>
      </div>

      {personsError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Could not load wards.
          </span>
          <button
            type="button"
            onClick={() => void refreshPersons()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {anyLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading ward status…
        </div>
      ) : wards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-base)]/60 p-8 text-center text-sm text-[var(--text-muted)]">
          No wards linked to your account yet.
        </div>
      ) : (
        <div className="space-y-3">
          {wards.map((w) => {
            const roll = w.uniqueId || w.roll || "";
            return <WardStatusCard key={w.id} ward={w} status={roll ? statuses[roll] : null} />;
          })}
        </div>
      )}

      <WidgetBoundary title="Recent Gate Activity">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <ActivityFeed activities={activity} wardName={activityWard} />
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function ChildStatusPage() {
  return (
    <WidgetBoundary title="Child Status">
      <Suspense fallback={<PageLoading />}>
        <ChildStatusInner />
      </Suspense>
    </WidgetBoundary>
  );
}
