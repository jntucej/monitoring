"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Megaphone, Bell } from "lucide-react";
import type { Role } from "@/lib/types";
import {
  NotificationRow,
  AnnouncementsResponse,
  fmtDateTime,
} from "./_shared";

interface NotificationsPayload {
  data: NotificationRow[];
}

function Inner() {
  const { data: alertsData } = useApiResource<NotificationsPayload>(
    "/api/notifications",
    { ttlMs: 30_000 },
  );
  const alerts: NotificationsPayload = alertsData ?? { data: [] };
  const { data: ann } = useApiResource<AnnouncementsResponse>(
    "/api/announcements/active",
    { ttlMs: 30_000 },
  );

  const all = [
    ...alerts.data.map((a) => ({
      kind: "alert" as const,
      id: a.id,
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
    })),
    ...(ann?.data ?? []).map((a) => ({
      kind: "announcement" as const,
      id: a.id,
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
    })),
  ].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">
          Notifications
        </h1>
        <nav className="flex gap-2 text-xs">
          <Link
            href="/student/notifications/alerts"
            className="text-text-secondary underline"
          >
            Alerts
          </Link>
          <Link
            href="/student/notifications/announcements"
            className="text-text-secondary underline"
          >
            Announcements
          </Link>
        </nav>
      </div>
      {all.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="You're all caught up."
          icon={<Bell className="h-5 w-5" />}
        />
      ) : (
        <ul className="space-y-2">
          {all.map((n) => (
            <li
              key={`${n.kind}:${n.id}`}
              className="surface-card bg-bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                {n.kind === "alert" ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
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

export default function StudentNotificationsPage() {
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
