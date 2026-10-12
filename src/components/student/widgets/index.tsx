"use client";
import { Suspense, lazy } from "react";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { STUDENT_WIDGETS } from "@/lib/student-widgets";
import { EmptyState } from "@/components/shared/EmptyState";

// Every card receives the full API payload and picks its slice.
export interface StudentWidgetProps {
  payload: Record<string, unknown>;
}

const CARDS: Record<string, React.LazyExoticComponent<React.ComponentType<StudentWidgetProps>>> = {
  "lastscan": lazy(() => import("./lastscan")),
  "passes": lazy(() => import("./passes")),
  "monthly": lazy(() => import("./monthly")),
  "curfew": lazy(() => import("./curfew")),
  // SCAFFOLD:CARDS — cards are injected above this line
};

export function StudentDashboardWidgets() {
  const { data, loading, error, refresh } = useApiResource<Record<string, unknown>>(
    "/api/student/dashboard",
    { ttlMs: 20_000 }
  );

  if (loading && !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STUDENT_WIDGETS.map((w) => (
          <Skeleton key={w.id} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Could not load dashboard: {error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] font-bold hover:bg-rose-500/20 transition self-start sm:self-auto"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="No dashboard data" description="Try refreshing in a moment." />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STUDENT_WIDGETS
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((w) => {
          const Card = CARDS[w.id];
          if (!Card) return null;
          return (
            <WidgetBoundary key={w.id} title={w.title}>
              <Suspense fallback={<Skeleton className="h-56 rounded-2xl" />}>
                <Card payload={data} />
              </Suspense>
            </WidgetBoundary>
          );
        })}
    </div>
  );
}
