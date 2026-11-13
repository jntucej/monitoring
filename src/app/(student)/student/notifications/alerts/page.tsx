"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bell } from "lucide-react";
import type { Role } from "@/lib/types";
import { NotificationRow, fmtDateTime } from "../_shared";

interface NotificationsPayload {
  data: NotificationRow[];
}

function Inner() {
  const { data } = useApiResource<NotificationsPayload>("/api/notifications", {
    ttlMs: 30_000,
  });
  const list = (data?.data ?? [])
    .map((a) => ({
      kind: "alert" as const,
      id: a.id,
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">
          Alerts
        </h1>
        <Link
          href="/student/notifications"
          className="text-xs text-text-secondary underline"
        >
          All notifications
        </Link>
      </div>
      {list.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="Nothing pending."
          icon={<Bell className="h-5 w-5" />}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-border bg-bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium text-text-primary">
                  {n.title}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {n.body}
              </p>
              {n.createdAt && (
                <p className="mt-1 text-xs text-text-muted">
                  {fmtDateTime(n.createdAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StudentAlertsPage() {
  return (
    <AuthGuard allowedRoles={["student"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary>
          <Inner />
        </WidgetBoundary>
      </Suspense>
    </AuthGuard>
  );
}
