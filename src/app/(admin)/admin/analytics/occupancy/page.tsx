"use client";

// src/app/(admin)/admin/analytics/occupancy/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the OccupancyAnalytics component.
import { OccupancyAnalytics } from "@/components/admin/OccupancyAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function OccupancyPage() {
  return (
    <div className="space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Monitor real-time residential hostel capacity, live building occupancy, and zoned headcounts across campus."
        contextLabel="Hostel Occupancy"
        why="Tracking live occupancy ensures compliance with hostel curfew policies, fire safety headcounts, and room capacity thresholds."
        statusTone="info"
        statusPill="Live Occupancy"
        statusSummary="Tracking active residents, visitor check-ins, and hostel vacancy levels in real time."
        primaryAction={{ label: "Campus Analytics", href: "/admin/analytics" }}
        secondaryAction={{ label: "Gate Telemetry", href: "/admin/gates" }}
      />
      <OccupancyAnalytics />
    </div>
  );
}
