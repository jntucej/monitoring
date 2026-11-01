"use client";

import { Suspense, useState } from "react";
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

type Tab = "all" | "alerts" | "announcements";

function Inner() {
  const [tab, setTab] = useState<Tab>("all");
  const { data: alerts } = useApiResource<NotificationsPayload>(
    "/api/notifications",
    { ttlMs: 30_000 },
  );
  const { data: ann } = useApiResource<AnnouncementsResponse>(
    "/api/announcements/active",
    { ttlMs: 30_000 },
  );

  const alertList = alerts?.data ?? [];
  const annList = ann?.data ?? [];
  const all = [
    ...alertList.map((a) => ({
      kind: "alert" as const,
      id: a.id,
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
    })),
    ...annList.map((a) => ({
      kind: "announcement" as const,
      id: a.id,
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
    })),
  ].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const filtered =
    tab === "all"
      ? all
      : all.filter((x) => x.kind === (tab === "alerts" ? "alert" : "announcement"));

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        Notifications
      </h1>
      <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
        {(["all", "alerts", "announcements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === t
                ? "bg-[var(--action-primary)] text-white"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="You're all caught up."
          icon={<Bell className="h-5 w-5" />}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li
              key={`${n.kind}:${n.id}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            >
              <div className="flex items-center gap-2">
                {n.kind === "alert" ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {n.title}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {n.body}
              </p>
              {n.createdAt && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
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
        <WidgetBoundary name="notifications">
          <Inner />
        </WidgetBoundary>
      </Suspense>
    </AuthGuard>
  );
}
