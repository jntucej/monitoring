"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { Megaphone, FileText, CalendarDays, AlertTriangle, Siren, Bell } from "lucide-react";
import type { Role } from "@/lib/types";
import { AnnouncementsResponse, fmtDateTime, KIND_LABELS } from "../_shared";

const KIND_ICONS: Record<string, typeof Megaphone> = {
  announcement: Megaphone,
  circular: FileText,
  event: CalendarDays,
  alert: AlertTriangle,
  emergency: Siren,
};

const FILTERS = Object.keys(KIND_LABELS);

function Inner() {
  const { data } = useApiResource<AnnouncementsResponse>("/api/announcements/active", {
    ttlMs: 30_000,
  });
  const [activeKind, setActiveKind] = useState<string>("all");

  const all = (data?.data ?? []);

  // The endpoint merges legacy (message) and campus_feed (body) — normalise once
  const items = useMemo(
    () =>
      all
        .map((a) => ({
          id: a.id,
          kind: a.kind ?? "announcement",
          title: a.title,
          body: a.body || a.message || "",
          priority: a.priority ?? "normal",
          audience: a.audience,
          createdAt: a.created_at,
          expiresAt: a.expires_at,
        }))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [all],
  );

  const filtered = activeKind === "all" ? items : items.filter((i) => i.kind === activeKind);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Announcements</h1>
        <Link href="/student/notifications" className="text-xs text-text-secondary underline">
          All notifications
        </Link>
      </div>

      <ContextSituationBar
        roleLabel="Student"
        purpose="Read campus circulars, institutional bulletins, event notices, and alerts"
        contextLabel="Campus Announcements"
        severity="info"
        statusPill={filtered.length > 0 ? `${filtered.length} shown` : "None"}
        statusSummary={
          filtered.length > 0
            ? `${filtered.length} item${filtered.length === 1 ? "" : "s"}${activeKind !== "all" ? ` in ${KIND_LABELS[activeKind]}` : ""}`
            : "Nothing to show."
        }
        why="Circulars, events, and alerts are categorised by kind so you can filter to what matters."
        primaryAction={{ label: "All Notifications", href: "/student/notifications" }}
        secondaryAction={{ label: "Campus Feed", href: "/student/campus" }}
      />

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Announcement categories">
        {FILTERS.map((k) => {
          const Icon = KIND_ICONS[k] ?? Bell;
          const active = activeKind === k;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveKind(k)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-bg-accent text-text-primary"
                  : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {KIND_LABELS[k]}
              {counts[k] !== undefined && (
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-bg-primary text-bg-surface" : "bg-bg-surface-muted text-text-muted"}`}>
                  {counts[k]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No announcements"
          description={activeKind !== "all" ? `No ${KIND_LABELS[activeKind]?.toLowerCase() ?? activeKind} published yet.` : "Nothing new."}
          icon={<Bell className="h-5 w-5" />}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const Icon = KIND_ICONS[item.kind] ?? Megaphone;
            return (
              <li key={item.id} className="surface-card bg-bg-surface p-3">
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 rounded-md p-1.5 ${
                      item.priority === "urgent"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-bg-surface-muted text-text-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{item.title}</span>
                      {item.priority === "urgent" && (
                        <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{item.body}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {item.createdAt && (
                        <span className="text-xs text-text-muted">{fmtDateTime(item.createdAt)}</span>
                      )}
                      {item.expiresAt && (
                        <span className="text-xs text-text-muted">· expires {fmtDateTime(item.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
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
