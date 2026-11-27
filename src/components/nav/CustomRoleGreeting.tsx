"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { buildCustomGreeting, type GreetingInput } from "@/lib/custom-greeting";

function getIstDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function CustomRoleGreeting(props: GreetingInput) {
  const [dismissedWish, setDismissedWish] = useState(false);
  const greeting = buildCustomGreeting(props);
  const storageKey = `greeting_wish_dismissed:${(props.role ?? "user").toLowerCase()}:${getIstDateKey()}`;

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1") {
        setDismissedWish(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [storageKey]);

  const handleDismissWish = () => {
    setDismissedWish(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, "1");
      }
    } catch {
      /* ignore storage errors */
    }
  };

  return (
    <div
      data-testid="custom-role-greeting"
      data-time-period={greeting.timePeriod}
      className="surface-card bg-bg-surface/90 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
            {greeting.headline}
          </h2>
          {props.role && (
            <span className="rounded-full border border-border bg-bg-elevated px-2.5 py-0.5 font-mono text-[11px] uppercase text-text-muted">
              {props.role.replace(/_/g, " ")}
            </span>
          )}
          {greeting.wishBadge && !dismissedWish && (
            <span className="inline-flex items-center gap-1 rounded-full bg-action-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-action-primary">
              <Sparkles className="h-3 w-3" />
              {greeting.wishBadge}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-text-secondary">{greeting.subline}</p>
      </div>

      {greeting.wishBadge && !dismissedWish && (
        <button
          type="button"
          onClick={handleDismissWish}
          aria-label="Dismiss special wish"
          className="self-start sm:self-center rounded-lg border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-bg-elevated inline-flex items-center gap-1"
        >
          <span>Dismiss</span>
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
