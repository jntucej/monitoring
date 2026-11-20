"use client";

import { Suspense, lazy, useState, useEffect } from "react";
import { ChildWeeklyActivity } from "@/components/parent/ChildWeeklyActivity";
import { ChildStatus } from "@/components/parent/ChildStatus";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import {
  BarChart3
} from "lucide-react";

const ChildActivityReviewPanel = lazy(
  () => import("@/components/parent/ChildActivityReviewPanel")
);

function ChildAttendanceInner() {
  const [reviewChildId, setReviewChildId] = useState<string | null>(null);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          Child Attendance
        </p>
        <p className="mt-1 text-sm text-muted">
          7-day gate activity summary for your wards
        </p>
      </div>

      <WidgetBoundary title="Ward Status">
        <ChildStatus />
      </WidgetBoundary>

      <WidgetBoundary title="Weekly Gate Activity">
        <ChildWeeklyActivity />
      </WidgetBoundary>

      {/* Period review + heatmap for each linked child */}
      <Suspense fallback={<PageLoading />}>
        {reviewChildId ? (
          <WidgetBoundary title="Activity Review">
            <ChildActivityReviewPanel childId={reviewChildId} />
          </WidgetBoundary>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-sm text-text-muted">
              Pick a child below to open their period review &amp; heatmap.
            </p>
            <ChildSelector onPick={setReviewChildId} />
          </div>
        )}
      </Suspense>
    </div>
  );
}

/**
 * Lightweight child picker — loads linked children and exposes a
 * button per child to drive the review panel.
 */
function ChildSelector({ onPick }: { onPick: (id: string) => void }) {
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authUser = useAuthStore.getState().user;
        const parentId = authUser?.id;
        if (!parentId) return;
        const res = await fetch(`/api/students?parentId=${parentId}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        if (cancelled || !res.ok) return;
        const json = await res.json().catch(() => null);
        const kids = Array.isArray(json?.data) ? json.data : [];
        setChildren(
          kids.map((k: { id?: string; uniqueId?: string; fullName?: string; name?: string }) => ({
            id: k.id ?? k.uniqueId ?? "",
            name: k.fullName ?? k.name ?? "Child",
          })).filter((k: { id: string }) => k.id)
        );
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return <PageLoading />;
  if (children.length === 0)
    return <p className="text-sm text-text-muted">No linked children found.</p>;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {children.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-primary hover:border-action-primary hover:text-action-primary"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

export default function ChildAttendancePage() {
  return (
    <AuthGuard allowedRoles={["guardian", "parent", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ChildAttendanceInner />
      </Suspense>
    </AuthGuard>
  );
}
