"use client";

import React from "react";
import { Cpu, Activity, User, Clock, ArrowDownLeft, ArrowUpRight, Wifi } from "lucide-react";

export interface GateDevice {
  id: string;
  name: string;
  location: string;
  gateCode?: string;
  status: "online" | "offline" | "maintenance";
  currentOperator: {
    id: string;
    name: string;
    employeeId?: string;
    workingHours?: string;
  };
  lastScanTime: string;
  totalScansToday: number;
  entriesToday: number;
  exitsToday: number;
  lastActive: string;
  uptime: number;
}

interface GateDeviceTrackerProps {
  devices: GateDevice[];
  onRefresh?: () => void;
}

export function GateDeviceTracker({ devices, onRefresh }: GateDeviceTrackerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            Gate Device Telemetry & Operator Tracker
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Real-time hardware status & assigned gate operators</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const isOnline = device.status === "online";
          const isMaintenance = device.status === "maintenance";

          return (
            <div
              key={device.id}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 hover:border-[var(--border-hover)] transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{device.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{device.location}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isOnline
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : isMaintenance
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? "bg-emerald-400 animate-pulse" : isMaintenance ? "bg-amber-400" : "bg-rose-400"
                    }`}
                  />
                  {device.status}
                </span>
              </div>

              {/* Active Operator */}
              <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)] font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Current Operator
                  </span>
                  <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {device.currentOperator.employeeId || "OP-ASSIGNED"}
                  </span>
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)]">{device.currentOperator.name}</div>
                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                  Shift: {device.currentOperator.workingHours || "06:00 AM - 02:00 PM"}
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                    Entries Today
                  </div>
                  <div className="text-base font-bold text-emerald-400 mt-1">{device.entriesToday}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-amber-400" />
                    Exits Today
                  </div>
                  <div className="text-base font-bold text-amber-400 mt-1">{device.exitsToday}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <div>Last Active: <span className="font-semibold text-[var(--text-primary)]">{device.lastActive}</span></div>
                <div className="flex items-center gap-1 font-mono font-bold text-emerald-400">
                  <Wifi className="w-3 h-3" />
                  {device.uptime}% Uptime
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}