"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle, Check } from "lucide-react";
import type { Alert } from "@/lib/types";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-rose-500/10", text: "text-rose-400", label: "Critical" },
  high: { bg: "bg-amber-500/10", text: "text-amber-400", label: "High" },
  medium: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Medium" },
  low: { bg: "bg-slate-500/10", text: "text-slate-400", label: "Low" },
  info: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Info" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const url = filter === "all" ? "/api/alerts" : `/api/alerts?resolved=${filter === "resolved"}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const json = await res.json();
      if (json.success) {
        setAlerts(Array.isArray(json.data) ? json.data : []);
        setError(null);
      } else {
        setError(json.error?.message ?? "Failed to load alerts");
      }
    } catch (err: any) {
      console.error("Failed to load alerts:", err);
      setError(err?.message ?? "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
      } else {
        alert(json.error?.message || "Failed to resolve alert");
      }
    } catch (err) {
      console.error("Failed to resolve alert:", err);
      alert("Failed to resolve alert due to network error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-[var(--text-muted)]">System alerts and notifications</p>
        </div>
        <div className="flex gap-2">
          {(["active", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                filter === f
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--action-warning)]" />
            Alerts
          </h3>
          <span className="text-sm text-[var(--text-muted)]">
            {loading ? "Loading…" : `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400 text-sm">{error}</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">
              No {filter === "all" ? "" : filter} alerts.
            </div>
          ) : (
            alerts.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
              return (
                <div key={alert.id} className="p-4 flex items-start gap-4">
                  <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
                    {alert.resolved ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{alert.title}</p>
                      <span className="text-xs text-[var(--text-muted)]">{timeAgo(alert.timestamp)}</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {alert.studentRoll && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{alert.studentRoll}</span>
                      )}
                      {alert.gateId && (
                        <span className="text-[10px] text-[var(--text-muted)]">at {alert.gateId}</span>
                      )}
                    </div>
                  </div>
                  {!alert.resolved && (
                    <button
                      onClick={() => resolve(alert.id)}
                      disabled={busyId === alert.id}
                      className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 inline-flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
