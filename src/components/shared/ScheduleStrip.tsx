/**
 * ScheduleStrip — horizontal strip of upcoming items with relative "in X min".
 * `items` should be sorted ascending by start. Shows up to `maxVisible`.
 */
import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScheduleItem {
  id: string;
  title: string;
  /** Subtitle, e.g. room / faculty / gate */
  subtitle?: string;
  start: string; // ISO
  end: string; // ISO
}

export interface ScheduleStripProps {
  items: ScheduleItem[];
  maxVisible?: number;
  className?: string;
}

function relativeTime(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  const diff = t - now;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  if (min < 60) return diff > 0 ? `in ${min} min` : `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return diff > 0 ? `in ${hr} h` : `${hr} h ago`;
  const day = Math.round(hr / 24);
  return diff > 0 ? `in ${day} d` : `${day} d ago`;
}

export function ScheduleStrip({ items, maxVisible = 4, className }: ScheduleStripProps) {
  if (items.length === 0) return null;

  const now = Date.now();
  const visible = items.slice(0, maxVisible);
  const next = items.find((i) => new Date(i.start).getTime() >= now) ?? items[0];
  const nextStart = new Date(next.start).getTime();
  const remaining = items.filter((i) => new Date(i.start).getTime() >= now).length;

  return (
    <div className={cn("rounded-xl border border-border bg-bg-surface p-3", className)}>
      {/* Next up */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1.5 rounded-lg bg-action-primary/10 text-action-primary shrink-0">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted">Next up</p>
          <p className="text-sm font-semibold text-text-primary truncate">
            {next.title}
            {next.subtitle ? <span className="font-normal text-text-muted"> · {next.subtitle}</span> : null}
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-sm font-mono font-semibold text-action-primary">
            {relativeTime(next.start, now)}
          </p>
          {remaining > 1 && (
            <p className="text-[10px] text-text-muted">{remaining} more today</p>
          )}
        </div>
      </div>

      {/* Strip */}
      <div className="flex gap-2 overflow-x-auto">
        {visible.map((item) => {
          const past = new Date(item.end).getTime() < now;
          const current =
            !past && new Date(item.start).getTime() <= now;
          return (
            <div
              key={item.id}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs min-w-[110px]",
                current
                  ? "border-action-primary bg-action-primary/10 text-action-primary"
                  : past
                    ? "border-border bg-bg-elevated text-text-muted opacity-50"
                    : "border-border bg-bg-elevated text-text-secondary"
              )}
            >
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-[10px] text-text-muted">
                {new Date(item.start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScheduleStrip;
