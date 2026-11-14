"use client";
import { TrendingUp, Clock, Users, Award } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

export function PrincipalDigest() {
  const res = useApiResource<any>(`/api/principal/digest?range=week`, {
    ttlMs: 5 * 60_000,
  });
  const d = res.data?.data;

  if (res.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!d) return null;

  const items = [
    { icon: Award,     label: "Approved",       value: d.approved,       tone: "text-action-success" },
    { icon: Users,     label: "Delegated",      value: d.delegated,      tone: "text-sky-500" },
    { icon: Clock,     label: "Avg decision",   value: d.avgDecision,    tone: "text-action-warning" },
    { icon: TrendingUp,label: "SLA adherence",  value: d.slaAdherence,   tone: "text-action-success" },
  ];

  return (
    <WidgetBoundary title="Weekly digest">
      <div className="surface-card bg-bg-surface p-5">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Your week
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {items.map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 ${tone}`} />
              <div>
                <div className="text-xs text-text-muted">{label}</div>
                <div className="text-lg font-semibold text-text-primary tabular-nums">
                  {value ?? "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
        {d.insight && (
          <p className="surface-card mt-4 pt-3 text-xs italic text-text-muted">
            {d.insight}
          </p>
        )}
      </div>
    </WidgetBoundary>
  );
}
