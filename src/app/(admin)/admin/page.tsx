"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { EntryExitChart } from "@/components/admin/EntryExitChart";
import { StudentList } from "@/components/admin/StudentList";
import { Users, DoorOpen, Activity, AlertTriangle } from "lucide-react";
import type { DashboardData } from "@/lib/types";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message ?? "Failed to load dashboard");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Refresh every 30s for live feel (only when tab is active)
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-[var(--text-muted)]">Loading live data…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
          {error}. Make sure the database is reachable.
        </div>
      </div>
    );
  }

  const activeGates = (data?.locations ?? []).filter((l) => l.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-[var(--text-muted)]">Live gate activity, students, and alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Students on Campus"
          value={(data?.onCampus ?? 0).toLocaleString()}
          icon={Users}
          color="#3b82f6"
          trend={data?.trendOnCampus}
        />
        <StatCard
          label="Active Gates"
          value={activeGates.toString()}
          icon={DoorOpen}
          color="#10b981"
        />
        <StatCard
          label="Today's Scans"
          value={(data?.totalScans ?? 0).toLocaleString()}
          icon={Activity}
          color="#8b5cf6"
          trend={data?.trendScans}
        />
        <StatCard
          label="Active Alerts"
          value={(data?.activeAlerts ?? 0).toString()}
          icon={AlertTriangle}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntryExitChart />
        <StudentList />
      </div>
    </div>
  );
}
