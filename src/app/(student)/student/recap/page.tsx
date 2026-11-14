"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Share2 } from "lucide-react";

interface RecapPayload {
  data: {
    userName: string;
    role: string;
    periodLabel: string;
    completedEvents: string[];
    earnedAchievements: Array<{ code: string; title: string; icon: string | null }>;
    completedGoals: number;
    totalGoals: number;
    eventsRegistered: number;
  };
}

// Shareable, non-surveillance recap.
export default function RecapPage() {
  const { data, loading } = useApiResource<RecapPayload>("/api/campus/recap", {
    ttlMs: 60_000,
  });
  if (loading || !data?.data) return <PageLoading />;
  const r = data.data;
  const share = async () => {
    const text = `${r.userName} · ${r.periodLabel}
${r.eventsRegistered} events attended
${r.earnedAchievements.length} achievements
${r.completedGoals}/${r.totalGoals} goals completed`;
    if (navigator.share) await navigator.share({ title: "Semester Recap", text });
    else await navigator.clipboard.writeText(text);
  };
  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className="surface-card bg-surface-muted p-6">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          {r.periodLabel}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">
          {r.userName}
        </h1>
        <p className="text-sm text-text-secondary">{r.role}</p>
        <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-text-muted">Events</dt>
            <dd className="text-xl font-bold">{r.eventsRegistered}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Achievements</dt>
            <dd className="text-xl font-bold">{r.earnedAchievements.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Goals</dt>
            <dd className="text-xl font-bold">
              {r.completedGoals}/{r.totalGoals}
            </dd>
          </div>
        </dl>
      </div>
      <button
        onClick={share}
        className="surface-card inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
      >
        <Share2 className="h-4 w-4" aria-hidden /> Share
      </button>
    </div>
  );
}
