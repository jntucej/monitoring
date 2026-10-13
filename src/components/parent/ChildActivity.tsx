"use client";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import type { Scan } from "@/lib/types";
import { useApi } from "@/hooks/useApi";

export function ChildActivity() {
const api = useApi();

  const [activities, setActivities] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [childRoll, setChildRoll] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const authRaw = sessionStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.state?.user?.id ?? auth?.user?.id;
      if (!parentId) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/students?parentId=${parentId}`, { headers: api.getHeaders(), cache: "no-store" });
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const json = await res.json();
      const kids = Array.isArray(json.data) ? json.data : [];
      // Use the first child for the activity feed (parent page shows top-level summary)
      const first = kids[0];
      if (!first) {
        setLoading(false);
        return;
      }
      setChildRoll(first.roll);
      const r2 = await fetch(`/api/persons/${encodeURIComponent(first.uniqueId || first.roll)}/history?limit=10`, {
        headers: api.getHeaders(),
        cache: "no-store",
      });
      if (!r2.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const j2 = await r2.json();
      setActivities(Array.isArray(j2?.data?.history) ? j2.data.history : []);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {error ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <div className="flex items-center gap-2 text-sm text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Could not load activity.</span>
            </div>
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition shrink-0"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
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
