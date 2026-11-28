"use client";

import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { ShieldAlert, Clock3, ChevronRight } from "lucide-react";

interface LockdownRuleOut {
  id: string;
  scope_type: string;
  direction: string;
  status: string;
  public_message: string | null;
}

/**
 * LockdownStatusPulse — a compact Principal-home strip that surfaces the
 * count of ACTIVE scoped lockdowns and PENDING-approval requests, linking to
 * the /principal/emergency control plane. Fetched from /api/admin/lockdown
 * (the Principal's GET), so no change to the home's main data path is needed.
 *
 * Inert (returns null) when there are no active or pending lockdown rules.
 */
export function LockdownStatusPulse() {
  const { data } = useApiResource<{ success: boolean; data: LockdownRuleOut[] }>(
    "/api/admin/lockdown",
    { ttlMs: 15_000 },
  );
  const rules = data?.data ?? [];
  const active = rules.filter((r) => r.status === "ACTIVE");
  const pending = rules.filter((r) => r.status === "PENDING_PRINCIPAL");

  if (active.length === 0 && pending.length === 0) return null;

  return (
    <div className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <ShieldAlert
          className={"size-4 " + (active.length ? "text-action-danger" : "text-action-warning")}
          aria-hidden
        />
        <div className="text-xs">
          {active.length > 0 && (
            <p className="font-medium text-text-primary">
              {active.length} active lockdown{active.length === 1 ? "" : "s"}
            </p>
          )}
          {pending.length > 0 && (
            <p className={"font-medium " + (active.length ? "text-text-muted" : "text-action-warning")}>
              <Clock3 className="mr-1 inline size-3" aria-hidden />
              {pending.length} awaiting your approval
            </p>
          )}
        </div>
      </div>
      <Link
        href="/principal/emergency"
        className="inline-flex items-center gap-1 text-xs font-medium text-action-primary hover:underline"
      >
        Open lockdown console <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
