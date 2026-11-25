"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { OccupancyHeatmap } from "@/components/admin/OccupancyHeatmap";
import { CampusDigitalTwin } from "@/components/admin/CampusDigitalTwin";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function OccupancyPage() {
  const [activeTab, setActiveTab] = useState<"heatmap" | "digital-twin">("heatmap");

  return (
    
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Live campus presence and the digital twin view"
        why="Occupancy data here drives curfew exceptions, exam-day access rules, and space planning."
        contextLabel="Live campus presence and the digital twin view"
        statusSummary="Review current live campus presence and the digital twin view state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <PageHeader
          title="Occupancy & Twin"
          subtitle="Live campus presence and the digital twin view"
        />
        <WidgetBoundary title="Occupancy & Twin">
          <div className="flex border-b border-border gap-4">
            <button
              onClick={() => setActiveTab("heatmap")}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "heatmap"
                  ? "border-action-success text-action-success"
                  : "border-transparent text-text-secondary"
              }`}
            >
              Live Presence Matrix
            </button>
            <button
              onClick={() => setActiveTab("digital-twin")}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "digital-twin"
                  ? "borderunit-c text-unit-c"
                  : "border-transparent text-text-secondary"
              }`}
            >
              2D Digital Twin Map
            </button>
          </div>

          <div className="pt-4">
            {activeTab === "heatmap" ? <OccupancyHeatmap /> : <CampusDigitalTwin />}
          </div>
        </WidgetBoundary>
      </div>
    
    

  );
}
