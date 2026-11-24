"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2, Filter } from "lucide-react";
import type { Scan } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { ActiveFilterBar } from "@/components/shared/ActiveFilterBar";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function StudentHistoryPage() {
const api = useApi();

  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const auth = useAuthStore.getState();
        const roll = auth?.user?.uniqueId;
        if (!roll) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(`/api/persons/${encodeURIComponent(roll)}/history?limit=200`, {
          headers: api.getHeaders(),
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
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Gate Scan History</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Complete log of your campus gate entries (IN) and exits (OUT).
          </p>
        </div>
        <div className="surface-card flex flex-wrap items-center gap-1 bg-bg-surface p-1">
          {(["ALL", "IN", "OUT"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h11 inline-flex items-center justify-center px-3 py-1 text-sm rounded-md transition ${
                filter === f
                  ? "bg-action-primary text-white"
                  : "text-text-muted hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Student"
        purpose="Audit chronological campus gate check-ins and check-outs verified by physical gate scanners"
        contextLabel="Gate Scan Records"
        statusPill={loading ? "Scanning…" : `${scans.length} scans logged`}
        statusSummary={
          scans.length > 0
            ? `Showing ${filtered.length} of ${scans.length} campus turnstile and gate scan events.`
            : "No gate scan records logged yet for your student identity."
        }
        primaryAction={{ label: "Active Gate Passes", href: "/student/passes" }}
        secondaryAction={{ label: "Attendance Calendar", href: "/student/attendance-calendar" }}
      />

      <div className="bg-bg-surface rounded-xl border border-border overflow-hidden">
        <ActiveFilterBar
        chips={
          filter === "ALL"
            ? []
            : [
                {
                  key: "direction",
                  label: "Direction",
                  value: filter,
                  onRemove: () => setFilter("ALL"),
                },
              ]
        }
        shownCount={filtered.length}
        totalCount={scans.length}
        onClearAll={() => setFilter("ALL")}
        noun="scans"
      />

      {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            <Filter className="size-5 mx-auto opacity-40 mb-2" />
            No scans match this filter.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s) => {
              const isIn = s.direction === "IN";
              return (
                <div key={s.id} className="p-4 flex items-center gap-3">
                  <div className={`size-5 rounded-lg flex items-center justify-center ${isIn ? "bg-emerald-500/10 text-action-success" : "bg-rose-500/10 text-action-danger"}`}>
                    {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isIn ? "text-action-success" : "text-action-danger"}`}>
                      {isIn ? "Entry" : "Exit"} {s.reason ? `(${s.reason})` : ""}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {s.gateName} {s.operatorName ? `• Operator: ${s.operatorName}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{new Date(s.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                    <p className="text-xs text-text-muted">
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
