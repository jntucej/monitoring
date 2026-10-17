"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Trophy, Star,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface AchievementDef {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  earnedAt?: string;
  earned?: boolean;
}

/**
 * Sysadmin Achievements — achievement definitions + earned counts.
 * Backend: /api/campus/achievements (open GET).
 */
function SysadminAchievementsInner() {
  const [earned, setEarned] = useState<AchievementDef[]>([]);
  const [available, setAvailable] = useState<AchievementDef[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campus/achievements", { headers: getAuthHeaders() });
      const body = await res.json();
      setEarned((body?.data?.earned ?? []) as AchievementDef[]);
      setAvailable((body?.data?.available ?? []) as AchievementDef[]);
    } catch (e) {
      console.error("achievements", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const unearned = available.filter((a) => !a.earned);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Achievements"
        subtitle={`${earned.length} earned · ${unearned.length} available`}
        onRefresh={load}
      />

      <WidgetBoundary title="Earned">
        <div className="glass-card">
          {earned.length === 0 ? (
            <EmptyState
              icon={<Trophy className="w-6 h-6" />}
              title="No achievements earned"
              description="Earned achievements appear here once awarded."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {earned.map((a) => (
                <div key={a.code} className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <span className="text-lg">{a.icon || "🏆"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{a.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{a.description}</p>
                  </div>
                  {a.earnedAt && (
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {new Date(a.earnedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Available">
        <div className="glass-card">
          {unearned.length === 0 ? (
            <EmptyState icon={<Star className="w-6 h-6" />} title="All achievements earned" />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {unearned.map((a) => (
                <div key={a.code} className="p-3 flex items-center gap-3 opacity-70">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                    <span className="text-lg">{a.icon || "⭐"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{a.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{a.description}</p>
                  </div>
                  {a.tier && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] shrink-0">{a.tier}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SysadminAchievementsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SysadminAchievementsInner />
    </AuthGuard>
  );
}
