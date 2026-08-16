"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { Scan } from "@/lib/types";

export function ChildActivity() {
  const [activities, setActivities] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [childRoll, setChildRoll] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
        const res = await fetch(`/api/students?parentId=${parentId}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        const kids = Array.isArray(json.data) ? json.data : [];
        // Use the first child for the activity feed (parent page shows top-level summary)
        const first = kids[0];
        if (!first) {
          setLoading(false);
          return;
        }
        setChildRoll(first.roll);
        const r2 = await fetch(`/api/students/${encodeURIComponent(first.roll)}/history?limit=10`, { cache: "no-store" });
        const j2 = await r2.json();
        if (!cancelled) {
          setActivities(Array.isArray(j2.data) ? j2.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading activity…
          </div>
        ) : !childRoll ? (
          <p className="text-sm text-[var(--text-muted)]">No linked students.</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No recent activity.</p>
        ) : (
          activities.map((a) => {
            const isIn = a.direction === "IN";
            const t = new Date(a.timestamp).toLocaleString("en-IN", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={a.id} className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-medium ${isIn ? "text-emerald-500" : "text-rose-500"}`}>
                  {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  <span className="capitalize">{a.direction === "IN" ? "Entry" : "Exit"}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">{t}</p>
                  <p className="text-xs text-gray-400">{a.gateName}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
