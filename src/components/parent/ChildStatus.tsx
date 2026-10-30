"use client";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import type { Student } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";

export function ChildStatus() {
  const [children, setChildren] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, { status: "IN" | "OUT"; last: { timestamp: string; gateName: string } | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Get parent ID from the canonical auth store (localStorage-backed, not sessionStorage).
      // Read via getState so `load` stays referentially stable (React Compiler).
      const authUser = useAuthStore.getState().user;
      const parentId = authUser?.id ?? null;
      if (!parentId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/students?parentId=${parentId}`, { headers: getAuthHeaders(), cache: "no-store" });
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const json = await res.json();
      const kids: Student[] = Array.isArray(json.data) ? json.data : [];
      setChildren(kids);

      // Get current status for each child
      const stat: Record<string, any> = {};
      await Promise.all(
        kids.map(async (k) => {
          const roll = k.uniqueId || k.roll || "";
          if (!roll) return;
          try {
            const r = await fetch(`/api/persons/${encodeURIComponent(roll)}`, { headers: getAuthHeaders(), cache: "no-store" });
            const j = await r.json();
            // persons API returns { person, campusStatus, lastScan, history }
            stat[roll] = j?.data?.campusStatus
              ? { status: j.data.campusStatus, last: j.data.lastScan ?? null }
              : { status: "OUT", last: null };
          } catch {
            stat[roll] = { status: "OUT", last: null };
          }
        })
      );
      setStatuses(stat);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, []);

  // Initial load + fast visibility-aware polling (10s for real-time movement monitoring)
  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  usePolling(load, { intervalMs: 10_000 });

  if (error) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-rose-300 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Could not load child status.</span>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading children…
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
        No linked students found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {children.map((child) => {
        const roll = child.uniqueId || child.roll || "";
        const name = child.fullName || child.name || "";
        const st = statuses[roll];
        const isIn = st?.status === "IN";
        const lastSeen = st?.last
          ? `${st.last.gateName} • ${new Date(st.last.timestamp).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}${st.last.reason ? ` • ${st.last.reason.replace(/_/g, " ")}` : ""}`
          : "No recent activity";
        return (
          <div key={child.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full border-2 border-[var(--border-strong)] overflow-hidden">
                {child.photoUrl || child.photo ? (
                  <img src={child.photoUrl || child.photo} alt={name} className="rounded-full w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-semibold">
                    {name?.[0] ?? "?"}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">{name}</h3>
                <p className="text-sm font-mono text-[var(--text-muted)]">{roll}</p>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Last seen: {lastSeen}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-white ${isIn ? "bg-emerald-500" : "bg-rose-500"}`}>
              {isIn ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-semibold">{isIn ? "Inside Campus" : "Outside Campus"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
