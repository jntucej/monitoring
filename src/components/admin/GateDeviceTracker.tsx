"use client";

import React from "react";
import { Cpu, Activity, ArrowDownLeft, ArrowUpRight, Wifi, User } from "lucide-react";

export interface GateDevice {
  id: string;
  name: string;
  location: string;
  gateCode?: string;
  status: "online" | "offline" | "maintenance";
  /** True only when the gate is configured active AND was scanned in the last 5 min. */
  isOnline: boolean;
  scannedRecently: boolean;
  onlineWindowMs: number;
  /**
   * The operator attributed to the most recent in-window scan. When
   * `attributed` is true the scan's own operator_name is shown; when false
   * it is the configured assignment (used as a fallback only).
   */
  lastOperator: {
    id: string | null;
    name: string;
    email: string;
    role: string;
    attributed: boolean;
    at: string;
  } | null;
  /** Operator actually assigned to this gate (users.gate_id). Empty when unassigned. */
  assignedOperators: Array<{ id: string; name: string; email: string; role: string }>;
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
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Cpu className="w-5 h-5 text-action-success" />
            Gate Device Telemetry & Operator Tracker
          </h2>
          <p className="text-xs text-text-muted">Real-time hardware status & assigned gate operators</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-bg-surface border border-border text-xs font-semibold text-text-primary hover:bg-bg-elevated transition flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-action-success" />
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
              className="bg-bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4 hover:border-[var(--border-hover)] transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">{device.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{device.location}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isOnline
                      ? "bg-emerald-500/10 text-action-success border border-emerald-500/20"
                      : isMaintenance
                      ? "bg-amber-500/10 text-action-warning border border-amber-500/20"
                      : "bg-rose-500/10 text-action-danger border border-rose-500/20"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? "bg-action-success animate-pulse" : isMaintenance ? "bg-action-warning" : "bg-action-danger"
                    }`}
                  />
                  {device.status}
                </span>
              </div>

              {/* Assigned operators (from users.gate_id) */}
              <div className="rounded-xl bg-bg-elevated border border-border p-3 space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
                  <User className="w-3.5 h-3.5 text-action-primary" />
                  Assigned Operator{device.assignedOperators.length !== 1 ? "s" : ""}
                </div>
                {device.assignedOperators.length === 0 ? (
                  <div className="text-xs text-text-muted">
                    Not assigned yet —{" "}
                    <a href="/sysadmin/gates" className="text-action-primary underline font-medium">
                      assign now
                    </a>
                  </div>
                ) : (
                  device.assignedOperators.map((op) => (
                    <div key={op.id} className="text-xs font-bold text-text-primary">
                      {op.name || op.email}
                      <span className="ml-1.5 text-[10px] font-mono text-[10px] font-bold text-action-primary bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {op.role}
                      </span>
                    </div>
                  ))
                )}

                {/* Who actually used the gate in the last 5 minutes */}
                {device.lastOperator && (
                  <div className="flex items-center justify-between text-[11px] mt-1 pt-2 border-t border-border">
                    <span className="text-text-muted flex items-center gap-1">
                      <Activity className="w-3 h-3 text-action-success" />
                      {device.lastOperator.attributed ? "Last scan by" : "Likely user"}
                    </span>
                    <span className="font-semibold text-text-primary">
                      {device.lastOperator.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-[10px] text-text-muted flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3 text-action-success" />
                    Entries Today
                  </div>
                  <div className="text-base font-bold text-action-success mt-1">{device.entriesToday}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="text-[10px] text-text-muted flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-action-warning" />
                    Exits Today
                  </div>
                  <div className="text-base font-bold text-action-warning mt-1">{device.exitsToday}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                <div>Last Active: <span className="font-semibold text-text-primary">{device.lastActive}</span></div>
                <div className="flex items-center gap-1 font-mono font-bold text-action-success">
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