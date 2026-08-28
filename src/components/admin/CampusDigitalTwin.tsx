"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { Radio, Flame, Users, TrendingUp, X, Activity } from "lucide-react";

interface DigitalTwinData {
  timestamp: string;
  gates: Array<{ id: string; name: string; status: string; last_scan: string; flow_rate: string }>;
  zones: Array<{
    id: string;
    name: string;
    type: string;
    capacity: number;
    current_occupancy: number;
    occupancy_percentage: number;
    breakdown?: { students: number; faculty: number; staff: number; visitors: number };
    predicted_occupancy_1h?: number;
  }>;
  total_occupancy: number;
  total_capacity: number;
  alerts: Array<{ id: string; location: string; severity: string; message: string }>;
}

export function CampusDigitalTwin() {
  const { token } = useAuthStore();
  const [twinData, setTwinData] = useState<DigitalTwinData | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTwin = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/admin/digital-twin", { headers });
        const result = await res.json();
        if (result.success && result.data) {
          setTwinData(result.data);
        }
      } catch {} finally {
        setLoading(false);
      }
    };

    fetchTwin();
    const interval = setInterval(fetchTwin, 10000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading || !twinData) {
    return <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Initializing 2D Campus Digital Twin Engine...</div>;
  }

  const getHeatmapColor = (pct: number) => {
    if (!showHeatmap) return "rgba(59, 130, 246, 0.15)";
    if (pct >= 85) return "rgba(239, 68, 68, 0.4)";
    if (pct >= 65) return "rgba(245, 158, 11, 0.35)";
    return "rgba(16, 185, 129, 0.25)";
  };

  const getStrokeColor = (pct: number) => {
    if (pct >= 85) return "#ef4444";
    if (pct >= 65) return "#f59e0b";
    return "#10b981";
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-400 animate-pulse" />
            2D Interactive Campus Digital Twin & Heatmap
          </CardTitle>
          <p className="text-xs text-[var(--text-secondary)]">
            Live layout with occupancy heatmaps, gate flow rates, and click-to-drill zone analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showHeatmap ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="gap-1 text-xs"
          >
            <Flame className="h-3.5 w-3.5" />
            {showHeatmap ? "Heatmap On" : "Heatmap Off"}
          </Button>
          <Badge variant="success" className="text-xs">
            Synced {new Date(twinData.timestamp).toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      <div className="relative w-full h-[400px] bg-slate-950 border border-[var(--border)] rounded-lg overflow-hidden flex items-center justify-center p-4">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#grid)" />

          <g id="zones">
            {twinData.zones[0] && (
              <g onClick={() => setSelectedZone(twinData.zones[0])} className="cursor-pointer">
                <rect
                  x="50" y="50" width="220" height="130" rx="8"
                  fill={getHeatmapColor(twinData.zones[0].occupancy_percentage)}
                  stroke={getStrokeColor(twinData.zones[0].occupancy_percentage)} strokeWidth="2"
                  className="hover:opacity-80 transition-all"
                />
                <text x="60" y="75" fill="#ffffff" fontSize="12" fontWeight="bold">{twinData.zones[0].name}</text>
                <text x="60" y="95" fill="#9ca3af" fontSize="10">
                  Occupancy: {twinData.zones[0].current_occupancy} / {twinData.zones[0].capacity} ({twinData.zones[0].occupancy_percentage}%)
                </text>
              </g>
            )}

            {twinData.zones[1] && (
              <g onClick={() => setSelectedZone(twinData.zones[1])} className="cursor-pointer">
                <rect
                  x="300" y="50" width="220" height="130" rx="8"
                  fill={getHeatmapColor(twinData.zones[1].occupancy_percentage)}
                  stroke={getStrokeColor(twinData.zones[1].occupancy_percentage)} strokeWidth="2"
                  className="hover:opacity-80 transition-all"
                />
                <text x="310" y="75" fill="#ffffff" fontSize="12" fontWeight="bold">{twinData.zones[1].name}</text>
                <text x="310" y="95" fill="#9ca3af" fontSize="10">
                  Occupancy: {twinData.zones[1].current_occupancy} / {twinData.zones[1].capacity} ({twinData.zones[1].occupancy_percentage}%)
                </text>
              </g>
            )}

            {twinData.zones[2] && (
              <g onClick={() => setSelectedZone(twinData.zones[2])} className="cursor-pointer">
                <rect
                  x="550" y="50" width="200" height="280" rx="8"
                  fill={getHeatmapColor(twinData.zones[2].occupancy_percentage)}
                  stroke={getStrokeColor(twinData.zones[2].occupancy_percentage)} strokeWidth="2"
                  className="hover:opacity-80 transition-all"
                />
                <text x="560" y="75" fill="#ffffff" fontSize="12" fontWeight="bold">{twinData.zones[2].name}</text>
                <text x="560" y="95" fill="#9ca3af" fontSize="10">
                  Occupancy: {twinData.zones[2].current_occupancy} / {twinData.zones[2].capacity} ({twinData.zones[2].occupancy_percentage}%)
                </text>
              </g>
            )}

            {(twinData.zones[3] || twinData.zones[4]) && (
              <g onClick={() => setSelectedZone(twinData.zones[3] || twinData.zones[4])} className="cursor-pointer">
                <rect
                  x="50" y="220" width="220" height="110" rx="8"
                  fill={getHeatmapColor((twinData.zones[3] || twinData.zones[4]).occupancy_percentage)}
                  stroke={getStrokeColor((twinData.zones[3] || twinData.zones[4]).occupancy_percentage)} strokeWidth="2"
                  className="hover:opacity-80 transition-all"
                />
                <text x="60" y="245" fill="#ffffff" fontSize="12" fontWeight="bold">{(twinData.zones[3] || twinData.zones[4]).name}</text>
                <text x="60" y="265" fill="#9ca3af" fontSize="10">
                  Occupancy: {(twinData.zones[3] || twinData.zones[4]).current_occupancy} ({(twinData.zones[3] || twinData.zones[4]).occupancy_percentage}%)
                </text>
              </g>
            )}
          </g>

          <g id="gates">
            {twinData.gates.map((g, i) => (
              <g key={g.id} transform={`translate(${180 + i * 140}, 360)`} className="cursor-pointer">
                <circle r="12" fill={g.status === "online" ? "#10b981" : "#f59e0b"} />
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">G{i + 1}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {selectedZone && (
        <div className="p-4 rounded border border-[var(--border)] bg-[var(--bg-surface-elevated)] space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)]">{selectedZone.name} Detailed Breakdown</h4>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedZone(null)} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-center">
              <span className="text-[var(--text-secondary)]">Students</span>
              <div className="font-bold text-sm text-blue-400">
                {selectedZone.breakdown?.students ?? Math.round(selectedZone.current_occupancy * 0.7)}
              </div>
            </div>
            <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-center">
              <span className="text-[var(--text-secondary)]">Faculty</span>
              <div className="font-bold text-sm text-emerald-400">
                {selectedZone.breakdown?.faculty ?? Math.round(selectedZone.current_occupancy * 0.15)}
              </div>
            </div>
            <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-center">
              <span className="text-[var(--text-secondary)]">Staff</span>
              <div className="font-bold text-sm text-amber-400">
                {selectedZone.breakdown?.staff ?? Math.round(selectedZone.current_occupancy * 0.1)}
              </div>
            </div>
            <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-center">
              <span className="text-[var(--text-secondary)]">Visitors</span>
              <div className="font-bold text-sm text-purple-400">
                {selectedZone.breakdown?.visitors ?? Math.round(selectedZone.current_occupancy * 0.05)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>1-Hour Predictive Occupancy Forecast:</span>
            </div>
            <span className="font-bold text-sm">
              {selectedZone.predicted_occupancy_1h ?? Math.round(selectedZone.current_occupancy * 1.08)} / {selectedZone.capacity}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}