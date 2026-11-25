"use client";

// src/app/(admin)/admin/analytics/sustainability/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the SustainabilityAnalytics component.
import { SustainabilityAnalytics } from "@/components/admin/SustainabilityAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SustainabilityPage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Track campus-wide energy, waste, and resource consumption against sustainability targets and regulatory reporting windows."
        contextLabel="Sustainability Analytics"
        why="Trend data into compliance dashboards for audits, accreditations, and ESG reporting."
        statusSummary="Review the current sustainability state and export reports below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
      />
      <SustainabilityAnalytics />
    </div>
  );
}
