"use client";

import { Sun, CloudSun, Moon, Coffee } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { StreakBadge } from "./StreakBadge";

function timeOfDay(): { icon: typeof Sun; greeting: string } {
  const h = new Date().getHours();
  if (h < 11) return { icon: Coffee, greeting: "Good morning" };
  if (h < 15) return { icon: Sun, greeting: "Good afternoon" };
  if (h < 19) return { icon: CloudSun, greeting: "Good evening" };
  return { icon: Moon, greeting: "Working late" };
}

export function MorningBrief({
  pending,
  cleared,
  target,
}: {
  pending: number;
  cleared: number;
  target: number;
}) {
  const user = useAuthStore((s) => s.user);
  const t = timeOfDay();
  const Icon = t.icon;

  const pct = target > 0 ? Math.min(100, Math.round((cleared / target) * 100)) : 0;
  const message =
    cleared === 0
      ? "A fresh queue — let's move the important ones first."
      : pending === 0
      ? "Queue is clear. Take the rest of the day."
      : cleared >= target
      ? "You're ahead of today's target. Keep going if you want."
      : `${pending} left — you're ${pct}% through today's target.`;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--action-primary)]/10">
            <Icon className="size-5 text-[var(--action-primary)]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t.greeting}, {user?.name?.split(" ")[0] ?? "Vice Principal"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
        <StreakBadge />
      </div>

      <p className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p>

      {target > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Today's progress</span>
            <span className="font-medium text-[var(--text-primary)] tabular-nums">
              {cleared} / {target}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--action-primary)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
