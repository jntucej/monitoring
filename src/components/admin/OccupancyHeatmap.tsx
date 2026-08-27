"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoneOccupancy } from "@/lib/occupancy";
import { MapPin, Users, Activity, Play, Pause, RefreshCw } from "lucide-react";

export function OccupancyHeatmap() {
  const [data, setData] = useState<{ total: number; capacity: number; zones: ZoneOccupancy[] }>({ total: 0, capacity: 0, zones: [] });
  const [selectedZone, setSelectedZone] = useState<ZoneOccupancy | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [timeLapseHour, setTimeLapseHour] = useState(24);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const eventSource = new EventSource("/api/occupancy/stream");
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.zones) {
          setData(payload);
        }
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  }, [isLive]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeLapseHour((prev) => (prev <= 0 ? 24 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "critical": return "error";
      case "high": return "offline";
      case "moderate": return "leave";
      default: return "success";
    }
  };

  const getHeatColor = (pct: number) => {
    if (pct >= 85) return "bg-red-500/20 border-red-500/50 text-red-300";
    if (pct >= 60) return "bg-amber-500/20 border-amber-500/50 text-amber-300";
    if (pct >= 30) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
    return "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-emerald-400" />
            Campus Occupancy Density & Real-Time Heatmap
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Live zone density stream (SSE) with 24-hour time-lapse replay controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "primary" : "secondary"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className="gap-1 text-xs"
          >
            <Activity className="h-3.5 w-3.5" />
            {isLive ? "Live Stream Active" : "Pause Stream"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Total Campus Occupants</div>
            <div className="text-2xl font-bold">{data.total} / {data.capacity}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Activity className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Campus Occupancy Rate</div>
            <div className="text-2xl font-bold">
              {data.capacity > 0 ? Math.round((data.total / data.capacity) * 100) : 0}%
            </div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <MapPin className="h-8 w-8 text-purple-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Active Campus Zones</div>
            <div className="text-2xl font-bold">{data.zones.length} Zones</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-2">
            24-Hour Time-Lapse Replay: {timeLapseHour === 24 ? "Current Time (Live)" : `T-${timeLapseHour} Hours Ago`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-1 text-xs"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? "Pause Replay" : "Play 24h Time-Lapse"}
          </Button>
        </div>
        <input
          type="range"
          min="0"
          max="24"
          value={timeLapseHour}
          onChange={(e) => setTimeLapseHour(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.zones.map((zone) => (
          <Card
            key={zone.id}
            onClick={() => setSelectedZone(zone)}
            className={`p-4 border transition-all cursor-pointer hover:scale-[1.01] ${getHeatColor(
              zone.occupancy_percentage
            )}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm">{zone.name}</h3>
                <span className="text-xs text-[var(--text-secondary)] capitalize">{zone.type} Zone</span>
              </div>
              <Badge variant={getBadgeVariant(zone.status)} className="text-xs">
                {zone.occupancy_percentage}%
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Occupancy</span>
                <span>{zone.current_occupancy} / {zone.capacity}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500 bg-current"
                  style={{ width: `${Math.min(100, zone.occupancy_percentage)}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedZone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-[var(--bg-surface)]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold">{selectedZone.name}</h2>
                <p className="text-xs text-[var(--text-secondary)] capitalize">{selectedZone.type} Zone Detail</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedZone(null)}>✕</Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 rounded bg-[var(--bg-surface-elevated)]">
                <span>Capacity Status</span>
                <span className="font-bold">{selectedZone.current_occupancy} / {selectedZone.capacity} ({selectedZone.occupancy_percentage}%)</span>
              </div>

              <div className="space-y-2">
                <div className="font-semibold">Demographic Breakdown</div>
                <div className="flex justify-between"><span>Students:</span> <span className="font-mono">{selectedZone.breakdown.students}</span></div>
                <div className="flex justify-between"><span>Faculty:</span> <span className="font-mono">{selectedZone.breakdown.faculty}</span></div>
                <div className="flex justify-between"><span>Staff:</span> <span className="font-mono">{selectedZone.breakdown.staff}</span></div>
                <div className="flex justify-between"><span>Visitors:</span> <span className="font-mono">{selectedZone.breakdown.visitors}</span></div>
              </div>
            </div>

            <Button variant="secondary" size="sm" className="w-full" onClick={() => setSelectedZone(null)}>
              Close Breakdown
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}