"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { Megaphone, Bell, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { Role } from "@/lib/types";
import {
  NotificationRow,
  AnnouncementsResponse,
  fmtDateTime,
} from "./_shared";

interface NotificationsPayload {
  data: NotificationRow[];
}

type MergedNotification = {
  kind: "alert" | "announcement";
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

function NotificationModal({
  n,
  onClose,
}: {
  n: MergedNotification;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [marked, setMarked] = useState(false);

  const handleMarkRead = useCallback(async () => {
    setMarked(true);
    try {
      await fetch(`/api/notifications/${encodeURIComponent(n.id)}`, {
        method: "PATCH",
      });
    } catch {
      // best-effort
    }
    setTimeout(onClose, 600);
  }, [n.id, onClose]);

  const isLong = n.body.length > 140;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="surface-card w-full max-w-md p-4 space-y-3 bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {n.kind === "alert" ? (
              <Bell className="h-4 w-4 shrink-0 text-warning-500" />
            ) : (
              <Megaphone className="h-4 w-4 shrink-0 text-info-500" />
            )}
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {n.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 hover:bg-bg-raised text-text-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <p
            className={`text-sm text-text-secondary whitespace-pre-wrap ${
              isLong && !expanded ? "line-clamp-3" : ""
            }`}
          >
            {n.body}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-link hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" /> Show more
                </>
              )}
            </button>
          )}
        </div>

        {n.createdAt && (
          <p className="text-xs text-text-muted">{fmtDateTime(n.createdAt)}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {marked ? (
            <span className="inline-flex items-center gap-1 text-xs text-success-500">
              <Check className="h-3.5 w-3.5" /> Marked as read
            </span>
          ) : (
            <button
              onClick={handleMarkRead}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" /> Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Inner() {
  const isSakuga = useIsSakuga();
  const [showToast, setShowToast] = useState(false);
  const [selected, setSelected] = useState<MergedNotification | null>(null);
  const { data: alertsData } = useApiResource<NotificationsPayload>(
    "/api/notifications",
    { ttlMs: 30_000 },
  );
  const alerts: NotificationsPayload = alertsData ?? { data: [] };
  const { data: ann } = useApiResource<AnnouncementsResponse>(
    "/api/announcements/active",
    { ttlMs: 30_000 },
  );

  const all: MergedNotification[] = [
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

  // Flash a sakuga-toast when there are unread alerts on first load
  const latestAlert = all[0];
  const isNewAlert =
    latestAlert?.createdAt &&
    new Date(latestAlert.createdAt).getTime() > Date.now() - 60_000;

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

      <ContextSituationBar
        roleLabel="Student"
        purpose="Unified notification feed consolidating urgent security/gate alerts and broadcast circulars"
        contextLabel="Notifications & Bulletins"
        severity={alerts.data.length > 0 ? "warn" : "info"}
        statusPill={`${all.length} messages (${alerts.data.length} alerts)`}
        statusSummary={
          alerts.data.length > 0
            ? `You have ${alerts.data.length} priority alert${alerts.data.length === 1 ? "" : "s"} and ${all.length - alerts.data.length} announcements.`
            : all.length > 0
              ? `You have ${all.length} total notifications across alerts and announcements.`
              : "All caught up! No unread notifications or announcements."
        }
        primaryAction={{ label: "Curfew & Alerts", href: "/student/notifications/alerts" }}
        secondaryAction={{ label: "Announcements", href: "/student/notifications/announcements" }}
      />

      {/* Sakuga-VFX toast flash for new alerts */}
      {isSakuga && isNewAlert && (
        <sakuga-toast visible={showToast} onClose={() => setShowToast(false)}>
          {latestAlert!.title}
        </sakuga-toast>
      )}

      {all.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="You're all caught up."
          icon={<Bell className="h-4 w-4" />}
        />
      ) : (
        <ul className="space-y-2">
          {all.map((n) => (
            <li
              key={`${n.kind}:${n.id}`}
              className="surface-card bg-bg-surface p-3"
            >
              <button
                onClick={() => setSelected(n)}
                className="w-full text-left"
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
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                  {n.body}
                </p>
                {n.createdAt && (
                  <p className="mt-1 text-xs text-text-muted">
                    {fmtDateTime(n.createdAt)}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <NotificationModal n={selected} onClose={() => setSelected(null)} />
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
