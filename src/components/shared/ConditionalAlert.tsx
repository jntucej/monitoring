"use client";

import { useEffect, useState } from "react";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { AlertDefinition, ALERT_CATALOGUE } from "@/lib/alert-hierarchy";
import type { AlertContext } from "@/lib/alert-hierarchy";
import { ChevronRight, X } from "lucide-react";

interface ConditionalAlertProps {
  ctx: AlertContext;
  limit?: number;
}

export function ConditionalAlert({ ctx, limit = 5 }: ConditionalAlertProps) {
  const [visible, setVisible] = useState<AlertDefinition[]>([]);

  useEffect(() => {
    const matches = ALERT_CATALOGUE.filter((a) => {
      // Tier gate
      const tier = getRoleTier(ctx.role);
      if (tier < a.minTier) return false;
      // Optional role allowlist
      if (a.visibleToRoles && !a.visibleToRoles.includes(ctx.role)) return false;
      // Dynamic condition
      return a.condition(ctx);
    });

    setVisible(matches.slice(0, limit));
  }, [ctx, limit]);

  if (!visible.length) return null;

  const tier = getRoleTier(ctx.role);

  return (
      <div className="space-y-2" role="region" aria-label="Active alerts">
        {visible.map((a) => (
          <div
            key={a.id}
            className={`relative rounded-xl border p-3.5 flex items-start gap-3
              ${a.severity === "critical" ? "border-rose-500/50 bg-rose-500/10" : ""}
              ${a.severity === "high" ? "border-amber-500/50 bg-amber-500/10" : ""}
              ${a.severity === "medium" ? "border-sky-500/50 bg-sky-500/10" : ""}
              ${a.severity === "low" ? "border-emerald-500/50 bg-emerald-500/10" : ""}
            `}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{a.title}</p>
              <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{a.message}</p>
              {a.href && (
                <a
                  href={a.href}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500 hover:underline"
                >
                  {a.ctaLabel ?? "Open"} <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded
              ${a.severity === "critical" ? "bg-rose-500/20 text-rose-300" : ""}
              ${a.severity === "high" ? "bg-amber-500/20 text-amber-300" : ""}
              ${a.severity === "medium" ? "bg-sky-500/20 text-sky-300" : ""}
              ${a.severity === "low" ? "bg-emerald-500/20 text-emerald-300" : ""}
            `}>
              {a.severity.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    );
}
