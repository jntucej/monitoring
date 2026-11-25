"use client";

// src/app/(admin)/admin/analytics/traffic/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the TrafficAnalytics component.
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function TrafficPage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Analyze live and historical gate throughput, occupancy, and entry/exit patterns to spot bottlenecks."
        contextLabel="Traffic Analytics"
        why="Use peak-hour insights to adjust gate staffing and curfew windows before congestion forms."
        statusSummary="Review the current traffic state and export reports below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
      />
      <TrafficAnalytics />
    </div>
  );
}
