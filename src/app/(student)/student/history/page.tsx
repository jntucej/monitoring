"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2, Filter } from "lucide-react";
import type { Scan } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";

export default function StudentHistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.state?.user?.uniqueId ?? auth?.state?.user?.roll ?? auth?.state?.user?.studentRoll ?? auth?.user?.uniqueId ?? auth?.user?.roll ?? auth?.user?.studentRoll;
        if (!roll) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(`/api/persons/${encodeURIComponent(roll)}/history?limit=200`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled) {
          setScans(Array.isArray(json?.data?.history) ? json.data.history : []);
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

  const filtered = filter === "ALL" ? scans : scans.filter((s) => s.direction === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My History</h1>
          <p className="text-[var(--text-muted)]">All your gate activity</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-1">
          {(["ALL", "IN", "OUT"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                filter === f
                  ? "bg-[var(--action-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            <Filter className="w-8 h-8 mx-auto opacity-40 mb-2" />
            No scans match this filter.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((s) => {
              const isIn = s.direction === "IN";
              return (
                <div key={s.id} className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIn ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isIn ? "text-emerald-400" : "text-rose-400"}`}>
                      {isIn ? "Entry" : "Exit"} {s.reason ? `(${s.reason})` : ""}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {s.gateName} {s.operatorName ? `• Operator: ${s.operatorName}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{new Date(s.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(s.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
