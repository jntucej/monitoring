"use client";

import React, { useState } from "react";
import { OccupancyHeatmap } from "@/components/admin/OccupancyHeatmap";
import { CampusDigitalTwin } from "@/components/admin/CampusDigitalTwin";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function OccupancyPage() {
  const [activeTab, setActiveTab] = useState<"heatmap" | "digital-twin">("heatmap");

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex border-b border-[var(--border)] gap-4">
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "heatmap" ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-secondary)]"
          }`}
        >
          Live Presence Matrix
        </button>
        <button
          onClick={() => setActiveTab("digital-twin")}
          className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "digital-twin" ? "border-purple-500 text-purple-400" : "border-transparent text-[var(--text-secondary)]"
          }`}
        >
          2D Digital Twin Map
        </button>
      </div>

      {activeTab === "heatmap" ? <OccupancyHeatmap /> : <CampusDigitalTwin />}
    </div>
    </AuthGuard>
  );
}