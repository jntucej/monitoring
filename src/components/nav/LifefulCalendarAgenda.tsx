"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  Sparkles,
  ArrowUpRight,
  CalendarCheck,
} from "lucide-react";
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import { useIsSakuga } from "@/components/student/useIsSakuga";

export interface LifefulCalendarItem {
  id: string;
  title: string;
  category?: string;
  timeRange?: string | null;
  location?: string | null;
  status?: string | null;
  note?: string | null;
  actionLabel?: string;
  actionHref?: string;
}

export function LifefulCalendarAgenda({
  selectedDateLabel,
  isToday = false,
  items = [],
  onJumpToday,
  emptyMessage = "No scheduled events or entries on this date.",
  quickLinks = [],
}: {
  selectedDateLabel: string;
  isToday?: boolean;
  items: LifefulCalendarItem[];
  onJumpToday?: () => void;
  emptyMessage?: string;
  quickLinks?: Array<{ label: string; href: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isSakuga = useIsSakuga();

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const key = (item.category ?? "general").toLowerCase();
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map);
  }, [items]);

  return (
    <div
      data-testid="lifeful-calendar-agenda"
      className="surface-card bg-bg-surface p-4 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-action-primary shrink-0" />
          <h3 className="text-sm font-semibold text-text-primary">
            {selectedDateLabel}
          </h3>
          {isToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-action-success">
              <Sparkles className="h-3 w-3" />
              Live Today
            </span>
          )}
          <span className="rounded-full border border-border bg-bg-elevated px-2 py-0.5 font-mono text-[11px] text-text-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && onJumpToday && (
            isSakuga ? (
              <sakuga-button variant="secondary" onClick={onJumpToday}>
                <span className="text-xs">Jump to Today</span>
              </sakuga-button>
            ) : (
              <button
                type="button"
                onClick={onJumpToday}
                className="rounded-lg border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-action-primary hover:bg-bg-surface transition-colors"
              >
                Jump to Today
              </button>
            )
          )}
        </div>
      </div>

      {countsByCategory.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {countsByCategory.map(([cat, count]) => (
            <span
              key={cat}
              className="rounded-md border border-border bg-bg-elevated/60 px-2 py-0.5 text-[11px] font-medium capitalize text-text-muted"
            >
              {cat.replace(/[_-]+/g, " ")}:{" "}
              <strong className="text-text-primary">{count}</strong>
            </span>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-elevated/30 p-4 text-xs text-text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-bg-elevated/40 p-3 space-y-2 transition-colors hover:border-action-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    {item.timeRange && (
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-text-primary">
                        <Clock className="h-3 w-3 text-action-primary" />
                        {item.timeRange}
                      </span>
                    )}
                    {item.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </span>
                    )}
                    {item.category && (
                      <span className="rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold break-words text-text-primary">
                    {item.title}
                  </p>
                </div>

                {item.status && (
                  <span className="rounded-full border border-border bg-bg-surface px-2 py-0.5 text-[11px] font-medium capitalize text-text-primary">
                    {item.status.replace(/[_-]+/g, " ")}
                  </span>
                )}
              </div>

              {item.note && (
                <p className="text-xs text-text-muted leading-relaxed">
                  <SmartTextRef text={item.note} currentPath={pathname} />
                </p>
              )}

              {item.actionHref && item.actionLabel && (
                <div className="pt-1">
                  {isSakuga ? (
                    <sakuga-button
                      variant="secondary"
                      onClick={() => router.push(item.actionHref!)}
                    >
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span>{item.actionLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </sakuga-button>
                  ) : (
                    <Link
                      href={item.actionHref}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-action-primary hover:underline"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {quickLinks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {quickLinks.map((ql) =>
            isSakuga ? (
              <sakuga-button
                key={ql.href + ql.label}
                variant="secondary"
                onClick={() => router.push(ql.href)}
              >
                <span className="inline-flex items-center gap-1 text-xs">
                  <span>{ql.label}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </sakuga-button>
            ) : (
              <Link
                key={ql.href + ql.label}
                href={ql.href}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-elevated/60 px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <span>{ql.label}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
