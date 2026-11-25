"use client";

import { Suspense, lazy, useState, useEffect } from "react";
import Link from "next/link";
import { ChildWeeklyActivity } from "@/components/parent/ChildWeeklyActivity";
import { ChildStatus } from "@/components/parent/ChildStatus";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
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

      <ContextSituationBar
        roleLabel="Student Guardian / Parent"
        purpose="Review weekly gate check-in patterns, curfew compliance, and activity heatmaps for wards."
        why="Auditing historical check-ins helps ensure wards maintain timely arrivals and meet campus residential curfews."
        contextLabel="Attendance & Gate Activity"
        statusTone="info"
        statusSummary="Monitor 7-day attendance trends, recent gate in/out scans, and period heatmaps."
        primaryAction={{ label: "Ward Status", href: "/guardian/child-status" }}
        secondaryAction={{ label: "Movement Records", href: "/guardian/movement-info" }}
      />

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
    return (
      <div className="surface-card bg-bg-base/60 p-6 text-center space-y-2 mt-3">
        <p className="text-sm font-semibold text-text-secondary">No linked children found</p>
        <p className="text-xs text-text-muted">No student profiles are associated with your guardian account.</p>
        <div className="pt-2">
          <Link
            href="/guardian/contact-info"
            className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
          >
            Update Contact Details
          </Link>
        </div>
      </div>
    );

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
