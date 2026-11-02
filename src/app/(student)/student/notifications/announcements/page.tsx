"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Megaphone } from "lucide-react";
import type { Role } from "@/lib/types";
import { AnnouncementsResponse, fmtDateTime } from "../_shared";

function Inner() {
  const { data } = useApiResource<AnnouncementsResponse>(
    "/api/announcements/active",
    { ttlMs: 30_000 },
  );
  const list = (data?.data ?? [])
    .map((a) => ({
      id: a.id,
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Announcements
        </h1>
        <Link
          href="/student/notifications"
          className="text-xs text-[var(--text-secondary)] underline"
        >
          All notifications
        </Link>
      </div>
      {list.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="Nothing new."
          icon={<Megaphone className="h-5 w-5" />}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
            >
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
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

export default function StudentAnnouncementsPage() {
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
