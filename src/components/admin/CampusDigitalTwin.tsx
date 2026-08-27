"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { Shield, Radio, AlertOctagon, Eye } from "lucide-react";

interface DigitalTwinData {
  timestamp: string;
  gates: Array<{ id: string; name: string; status: string; last_scan: string; flow_rate: string }>;
  zones: Array<{ id: string; name: string; type: string; capacity: number; current_occupancy: number; occupancy_percentage: number }>;
  total_occupancy: number;
  total_capacity: number;
  alerts: Array<{ id: string; location: string; severity: string; message: string }>;
}

export function CampusDigitalTwin() {
  const { token } = useAuthStore();
  const [twinData, setTwinData] = useState<DigitalTwinData | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
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
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-400 animate-pulse" />
            2D Interactive Campus Digital Twin
          </CardTitle>
          <p className="text-xs text-[var(--text-secondary)]">
            Live SVG layout rendering real-time turnstiles, zone capacities, and incident vectors.
          </p>
        </div>
        <Badge variant="success" className="text-xs">
          Synced {new Date(twinData.timestamp).toLocaleTimeString()}
        </Badge>
      </div>

      <div className="relative w-full h-[400px] bg-slate-950 border border-[var(--border)] rounded-lg overflow-hidden flex items-center justify-center p-4">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          {/* Campus Grid Background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#grid)" />

          {/* Zones SVG Representations */}
          <g id="zones">
            {/* Academic North */}
            <rect
              x="50" y="50" width="220" height="130" rx="8"
              fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="2"
              className="cursor-pointer hover:fill-emerald-500/30 transition-all"
              onClick={() => setSelectedEntity(twinData.zones[0])}
            />
            <text x="60" y="75" fill="#34d399" fontSize="12" fontWeight="bold">Academic Block North</text>
            <text x="60" y="95" fill="#9ca3af" fontSize="10">Occupancy: {twinData.zones[0]?.current_occupancy || 360} ({twinData.zones[0]?.occupancy_percentage || 45}%)</text>

            {/* Academic South */}
            <rect
              x="300" y="50" width="220" height="130" rx="8"
              fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="2"
              className="cursor-pointer hover:fill-amber-500/30 transition-all"
              onClick={() => setSelectedEntity(twinData.zones[1])}
            />
            <text x="310" y="75" fill="#fbbf24" fontSize="12" fontWeight="bold">Academic Block South</text>
            <text x="310" y="95" fill="#9ca3af" fontSize="10">Occupancy: {twinData.zones[1]?.current_occupancy || 408} ({twinData.zones[1]?.occupancy_percentage || 68}%)</text>

            {/* Hostel Complex */}
            <rect
              x="550" y="50" width="200" height="280" rx="8"
              fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="2"
              className="cursor-pointer hover:fill-red-500/30 transition-all"
              onClick={() => setSelectedEntity(twinData.zones[2])}
            />
            <text x="560" y="75" fill="#f87171" fontSize="12" fontWeight="bold">Hostel Quadrangle</text>
            <text x="560" y="95" fill="#9ca3af" fontSize="10">Occupancy: {twinData.zones[2]?.current_occupancy || 820} ({twinData.zones[2]?.occupancy_percentage || 82}%)</text>

            {/* Admin Block */}
            <rect
              x="50" y="220" width="220" height="110" rx="8"
              fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="2"
              className="cursor-pointer hover:fill-blue-500/30 transition-all"
              onClick={() => setSelectedEntity(twinData.zones[4])}
            />
            <text x="60" y="245" fill="#60a5fa" fontSize="12" fontWeight="bold">Admin & Library Hub</text>
            <text x="60" y="265" fill="#9ca3af" fontSize="10">Occupancy: {twinData.zones[4]?.current_occupancy || 273} ({twinData.zones[4]?.occupancy_percentage || 91}%)</text>
          </g>

          {/* Gates Indicators */}
          <g id="gates">
            {twinData.gates.map((g, i) => (
              <g key={g.id} transform={`translate(${180 + i * 140}, 360)`} className="cursor-pointer" onClick={() => setSelectedEntity(g)}>
                <circle r="12" fill={g.status === "online" ? "#10b981" : "#f59e0b"} />
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">G{i+1}</text>
              </g>
            ))}
          </g>

          {/* Active Incident Alert Pulsating Node */}
          <g transform="translate(650, 180)">
            <circle r="18" fill="rgba(239, 68, 68, 0.4)" className="animate-ping" />
            <circle r="8" fill="#ef4444" className="cursor-pointer" onClick={() => setSelectedEntity(twinData.alerts[0])} />
          </g>
        </svg>
      </div>

      {selectedEntity && (
        <div className="p-3 rounded border border-[var(--border)] bg-[var(--bg-surface-elevated)] flex justify-between items-center text-xs">
          <div>
            <span className="font-bold">{selectedEntity.name || selectedEntity.location || selectedEntity.id}</span>
            <p className="text-[var(--text-secondary)]">{selectedEntity.message || selectedEntity.flow_rate || `Occupancy: ${selectedEntity.current_occupancy || 0}`}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedEntity(null)}>Dismiss</Button>
        </div>
      )}
    </Card>
  );
}