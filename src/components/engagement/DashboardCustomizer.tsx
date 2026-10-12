"use client";

/**
 * Dashboard Customizer — reorders, pins and un-pins the engagement
 * widgets, plus exposes the engagement notification preferences
 * (quiet hours / daily summary / per-category alerts).
 *
 * This component persists only display preferences in
 * `useEngagementStore` (zustand + localStorage). It deliberately
 * changes which widgets the user sees and in what order — it never
 * grants, denies or re-scales any data access: every widget still
 * calls the same permission-checked API routes.
 */
import { useCallback, useMemo, useState } from "react";
import {
  Layout,
  GripVertical,
  Pin,
  Bell,
  Moon,
  Sunrise,
  RotateCcw,
  Check,
  User,
  Megaphone,
  CalendarDays,
  Award,
  Target,
  Bot,
  Sparkles,
  BellRing,
} from "lucide-react";
import {
  useEngagementStore,
  resolveWidgetOrder,
  type EngagementWidgetId,
} from "@/stores/engagementStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

const WIDGET_LABELS: Record<EngagementWidgetId, { label: string; icon: typeof User }> = {
  profile: { label: "My Campus Profile", icon: User },
  feed: { label: "Campus Feed", icon: Megaphone },
  events: { label: "Campus Events", icon: CalendarDays },
  achievements: { label: "Achievements", icon: Award },
  goals: { label: "Personal Goals", icon: Target },
  assistant: { label: "Campus Assistant", icon: Bot },
  recap: { label: "Semester Recap", icon: Sparkles },
  notifications: { label: "Notifications", icon: Bell },
};

export function DashboardCustomizer() {
  const widgetOrder = useEngagementStore((s) => s.widgetOrder);
  const pinnedWidgets = useEngagementStore((s) => s.pinnedWidgets);
  const notificationPrefs = useEngagementStore((s) => s.notificationPrefs);
  const setWidgetOrder = useEngagementStore((s) => s.setWidgetOrder);
  const togglePin = useEngagementStore((s) => s.togglePin);
  const setNotificationPrefs = useEngagementStore((s) => s.setNotificationPrefs);
  const resetLayout = useEngagementStore((s) => s.resetLayout);

  const [confirmReset, setConfirmReset] = useState(false);

  const order = useMemo(
    () => resolveWidgetOrder({ widgetOrder, pinnedWidgets }),
    [widgetOrder, pinnedWidgets]
  );

  function move(id: EngagementWidgetId, dir: -1 | 1) {
    const current = order.indexOf(id);
    const target = current + dir;
    if (current === -1 || target < 0 || target >= order.length) return;
    const next = [...order];
    next.splice(current, 1);
    next.splice(target, 0, id);
    // Save the unpinned ordering; resolveWidgetOrder re-inserts pinned
    // widgets at the top on next read.
    setWidgetOrder(next.filter((w) => !pinnedWidgets.includes(w)));
  }

  function togglePref(patch: Partial<typeof notificationPrefs>) {
    setNotificationPrefs(patch);
  }

  return (
    <WidgetBoundary title="Dashboard Customizer">
      <section
        aria-label="Dashboard customizer"
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Layout className="h-4 w-4 text-indigo-400" aria-hidden />
            Dashboard Layout
          </h2>
          <p className="text-[10px] text-[var(--text-muted)]">
            Reorder &amp; pin widgets — access is unchanged
          </p>
        </div>

        <ul className="mt-4 space-y-2" aria-label="Widget order">
          {order.map((id) => {
            const meta = WIDGET_LABELS[id];
            const Icon = meta.icon;
            const pinned = pinnedWidgets.includes(id);
            const index = order.indexOf(id);
            return (
              <li
                key={id}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/30 p-2.5"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-50" aria-hidden />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Position {index + 1} of {order.length}
                    {pinned ? " · pinned" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${meta.label} up`}
                    className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={index === order.length - 1}
                    aria-label={`Move ${meta.label} down`}
                    className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePin(id)}
                    aria-pressed={pinned}
                    aria-label={pinned ? `Unpin ${meta.label}` : `Pin ${meta.label} to top`}
                    className={`rounded-md border px-1.5 py-1 motion-safe:transition-colors motion-reduce:transition-none ${
                      pinned
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-amber-300"
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center gap-2">
          {confirmReset ? (
            <>
              <span className="text-[11px] text-[var(--text-muted)]">Reset layout to defaults?</span>
              <button
                type="button"
                onClick={() => {
                  resetLayout();
                  setConfirmReset(false);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[11px] font-medium text-rose-300"
              >
                <Check className="h-3 w-3" aria-hidden /> Yes, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-muted)]"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] motion-safe:transition-colors motion-reduce:transition-none"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset layout
            </button>
          )}
          <p className="ml-auto text-[10px] text-[var(--text-muted)]">
            Saved locally — only your layout changes.
          </p>
        </div>

        {/* Notification preferences (surfacing only; the server still
            enforces all real delivery permissions). */}
        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/20 p-3.5">
          <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
            <BellRing className="h-4 w-4 text-amber-400" aria-hidden />
            Notification preferences
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            Controls how engagement digests are surfaced for you — quiet hours and
            daily summary only.
          </p>

          <div className="mt-3 space-y-2.5">
            <ToggleRow
              icon={Moon}
              label="Quiet hours"
              hint="No alerts during quiet window"
              on={notificationPrefs.quietHours}
              onToggle={() => void togglePref({ quietHours: !notificationPrefs.quietHours })}
            />
            {notificationPrefs.quietHours && (
              <div className="grid grid-cols-2 gap-2.5 pl-2">
                <label className="block text-[10px] text-[var(--text-muted)]">
                  From
                  <input
                    type="time"
                    value={notificationPrefs.quietHoursFrom}
                    onChange={(e) =>
                      void togglePref({ quietHoursFrom: e.target.value })
                    }
                    className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
                  />
                </label>
                <label className="block text-[10px] text-[var(--text-muted)]">
                  To
                  <input
                    type="time"
                    value={notificationPrefs.quietHoursTo}
                    onChange={(e) =>
                      void togglePref({ quietHoursTo: e.target.value })
                    }
                    className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
                  />
                </label>
              </div>
            )}
            <ToggleRow
              icon={Sunrise}
              label="Daily summary"
              hint="One digest instead of many"
              on={notificationPrefs.dailySummary}
              onToggle={() => void togglePref({ dailySummary: !notificationPrefs.dailySummary })}
            />
            {notificationPrefs.dailySummary && (
              <label className="block pl-2 text-[10px] text-[var(--text-muted)]">
                Summary time
                <input
                  type="time"
                  value={notificationPrefs.dailySummaryTime}
                  onChange={(e) =>
                    void togglePref({ dailySummaryTime: e.target.value })
                  }
                  className="mt-0.5 w-36 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
                />
              </label>
            )}
            <ToggleRow
              icon={CalendarDays}
              label="Event reminders"
              hint="Remind me about registered events"
              on={notificationPrefs.eventReminders}
              onToggle={() => void togglePref({ eventReminders: !notificationPrefs.eventReminders })}
            />
            <ToggleRow
              icon={Megaphone}
              label="Announcement alerts"
              hint="Alert me about new announcements"
              on={notificationPrefs.announcementAlerts}
              onToggle={() => void togglePref({ announcementAlerts: !notificationPrefs.announcementAlerts })}
            />
          </div>
        </div>
      </section>
    </WidgetBoundary>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  on,
  onToggle,
}: {
  icon: typeof Moon;
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pl-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        aria-label={label}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors motion-reduce:transition-none ${
          on
            ? "border-emerald-500/50 bg-emerald-500/30"
            : "border-[var(--border)] bg-[var(--bg-raised)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-[left] motion-reduce:transition-none ${
            on ? "left-[18px] bg-emerald-400" : "left-0.5 bg-[var(--text-muted)]"
          }`}
        />
      </button>
    </div>
  );
}