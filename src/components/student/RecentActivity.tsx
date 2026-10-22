"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { Scan } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

/**
 * Self-service gate activity feed. Works for every account type with a
 * uniqueId (student, faculty, staff, worker) via /api/persons/:id/history.
 */
export function RecentActivity() {
  const [activities, setActivities] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const authRaw = sessionStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const uniqueId = auth?.state?.user?.uniqueId ?? auth?.state?.user?.roll ?? auth?.user?.uniqueId ?? auth?.user?.roll;
      if (!uniqueId) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/persons/${encodeURIComponent(uniqueId)}/history?limit=5`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      const history = json?.data?.history;
      setActivities(Array.isArray(history) ? history : []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  // Initial load + visibility-aware polling (no raw setInterval)
  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  usePolling(load, { intervalMs: 30_000 });

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No activity yet.</p>
        ) : (
          activities.map((a) => {
            const isIn = a.direction === "IN";
            return (
              <div key={a.id} className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-medium ${isIn ? "text-emerald-400" : "text-rose-400"}`}>
                  {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  <span className="capitalize">{isIn ? "Entry" : "Exit"}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {new Date(a.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{a.gateName}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
