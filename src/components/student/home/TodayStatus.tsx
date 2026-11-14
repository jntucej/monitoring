"use client";

import { useMemo } from "react";
import { LogIn, LogOut, Clock } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { useAuthStore } from "@/stores/authStore";
import { getTimeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardPayload {
  lastScan: { direction: "IN" | "OUT"; gateName: string; timestamp: string } | null;
  curfew: { today: { score: number; late: number } };
  activePasses: Array<{ id: string }>;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function TodayStatus() {
  const user = useAuthStore((s) => s.user);
  const { data, loading } = useApiResource<DashboardPayload>("/api/student/dashboard", {
    ttlMs: 30_000,
  });

  const state = useMemo(() => {
    if (!data?.lastScan) return { label: "No scans today", tone: "neutral" as const, Icon: Clock };
    if (data.lastScan.direction === "IN")
      return { label: "Inside campus", tone: "in" as const, Icon: LogIn };
    return { label: "Outside campus", tone: "out" as const, Icon: LogOut };
  }, [data]);

  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  const time = data?.lastScan ? getTimeAgo(data.lastScan.timestamp) : "—";

  return (
    <div className="surface-card bg-bg-surface p-4">
      <p className="text-sm text-text-secondary">{greeting()},</p>
      <h1 className="text-xl font-semibold text-text-primary">
        {user?.name ?? "Student"}
      </h1>
      <div className="mt-3 flex items-center gap-2">
        <state.Icon
          className={`h-5 w-5 ${
            state.tone === "in"
              ? "text-action-success"
              : state.tone === "out"
                ? "textalert-warning"
                : "text-text-muted"
          }`}
          aria-hidden
        />
        <span className="text-base font-medium text-text-primary">
          {state.label}
        </span>
        {data?.lastScan && (
          <span className="text-sm text-text-muted">
            · last scan {time}
          </span>
        )}
      </div>
    </div>
  );
}
