"use client";

/**
 * WeeklyTimetableGrid — a 5-day (Mon–Fri) upcoming-sessions grid for a class,
 * built from REAL upcoming session records (the roster `upcoming[]`: date +
 * time_in/out). No synthetic schedule: days with no upcoming session show an
 * explicit empty cell. Clicking a session row calls `onInspectSession`.
 */
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { CalendarDays, Inbox } from "lucide-react";

export interface UpcomingSession {
  date: string; // YYYY-MM-DD
  timeIn: string | null; // HH:MM
  timeOut: string | null;
}

interface Props {
  sessions: UpcomingSession[];
  title?: string;
  onInspectSession?: (s: UpcomingSession) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Group upcoming sessions by weekday (Sun=0..Sat=6) and keep Mon–Fri. */
function byWeekday(sessions: UpcomingSession[]) {
  const map = new Map<number, UpcomingSession[]>();
  for (const s of sessions) {
    const d = new Date(`${s.date}T00:00:00`);
    const dow = d.getDay(); // 0=Sun
    const idx = dow === 0 ? 4 : dow - 1; // Mon..Fri
    if (idx < 0 || idx > 4) continue;
    const list = map.get(idx) ?? [];
    list.push(s);
    map.set(idx, list);
  }
  return map;
}

export function WeeklyTimetableGrid({ sessions, title = "Upcoming Sessions", onInspectSession }: Props) {
  const groups = byWeekday(sessions);
  const hasAny = sessions.length > 0;

  return (
    <WidgetBoundary name="WeeklyTimetableGrid" title={title}>
      <div className="p-4 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
          <CalendarDays className="w-3.5 h-3.5" /> Next sessions
        </div>
        {!hasAny ? (
          <div className="flex items-center gap-2 text-sm text-text-muted min-h-12">
            <Inbox className="w-4 h-4" /> No upcoming sessions scheduled for this class.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 min-w-0">
            {DAYS.map((day, i) => {
              const items = groups.get(i) ?? [];
              return (
                <div key={day} className="rounded-lg border border-border bg-bg-elevated/40 p-2 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">{day}</p>
                  {items.length === 0 ? (
                    <p className="text-[11px] text-text-muted/70">—</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((s, j) => (
                        <button
                          key={`${s.date}-${j}`}
                          type="button"
                          onClick={() => onInspectSession?.(s)}
                          className="block w-full rounded-md bg-bg-surface px-2 py-1 text-[11px] text-left font-mono text-text-secondary hover:bg-bg-elev-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                          aria-label={`Session ${s.date} ${s.timeIn ?? ""}–${s.timeOut ?? ""}`}
                        >
                          {s.timeIn ?? "–"}{s.timeOut ? `–${s.timeOut}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}
