// src/components/shared/LiveClassCard.tsx
// A compact "live classes right now" widget for the role dashboards.
// Polls /api/class-sessions/live (server clamps the scope to the caller's role)
// and shows the live/upcoming/missed counts + a short list of the in-progress
// sessions. No per-student data — sessions + faculty names only.

"use client";

import { useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { Loader2 } from "lucide-react";

interface LiveSession {
  sessionId: string;
  className: string;
  subjectCode: string | null;
  periodNo: number;
  facultyName: string | null;
  startAt: string;
  endAt: string;
  state: "LIVE" | "UPCOMING" | "MISSED" | "SUBSTITUTED" | "ENDED";
  confirmation: string | null;
}

interface LiveResponse {
  success: boolean;
  data?: {
    now: string;
    counts: { total: number; live: number; upcoming: number; missed: number; substituted: number };
    sessions: LiveSession[];
  };
  error?: { message?: string };
}

function fmt(t: string): string {
  return t?.slice(0, 5) ?? "—";
}

export function LiveClassCard({
  title,
  scope,
  intervalMs = 30_000,
}: {
  title?: string;
  scope?: "self" | "department" | "academic" | "campus";
  intervalMs?: number;
}) {
  const [data, setData] = useState<LiveResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const url = `/api/class-sessions/live${scope ? `?scope=${scope}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const json = (await res.json()) as LiveResponse;
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error?.message ?? "Failed to load live classes");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load live classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [scope]);
  usePolling(load, { intervalMs, enabled: true });

  const inProgress = useMemo(
    () =>
      (data?.sessions ?? [])
        .filter((s) => s.state === "LIVE" || s.state === "SUBSTITUTED")
        .slice(0, 6),
    [data]
  );

  return (
    <WidgetBoundary name="LiveClassCard" title={title ?? "Classes right now"}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-action-success tabular-nums">
              {data ? data.counts.live : <Loader2 className="w-5 h-5 animate-spin inline" />}
            </p>
            <p className="text-xs uppercase tracking-wide text-text-muted">Live</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-action-info tabular-nums">
              {data ? data.counts.upcoming : "…"}
            </p>
            <p className="text-xs uppercase tracking-wide text-text-muted">Upcoming</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-action-danger tabular-nums">
              {data ? data.counts.missed : "…"}
            </p>
            <p className="text-xs uppercase tracking-wide text-text-muted">Missed</p>
          </div>
        </div>

        {error && <p className="text-xs text-action-danger">{error}</p>}

        {inProgress.length > 0 ? (
          <ul className="space-y-1">
            {inProgress.map((s) => (
              <li key={s.sessionId} className="text-sm text-text-secondary flex justify-between gap-2">
                <span className="truncate">
                  {s.className} · {s.periodNo}
                  {s.subjectCode ? ` · ${s.subjectCode}` : ""}
                  {s.state === "SUBSTITUTED" ? " (sub)" : ""}
                </span>
                <span className="text-xs text-text-muted shrink-0">
                  {fmt(s.startAt)}–{fmt(s.endAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          !error &&
          <p className="text-xs text-text-muted">No classes in progress right now.</p>
        )}
      </div>
    </WidgetBoundary>
  );
}
