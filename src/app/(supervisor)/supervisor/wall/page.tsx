"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import {
  DoorOpen,
  ShieldAlert,
  Moon,
  Wrench,
  CheckCircle2,
  Users,
  Activity,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Clock,
  Radio,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { usePolling } from "@/hooks/usePolling";

interface GateInfo {
  id: string;
  name: string;
  gateCode?: string;
  gate_code?: string;
  location?: string;
  type?: string;
  audience?: string;
  is_active?: boolean;
  isActive?: boolean;
}

export function SupervisorGateWallInner() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [gates, setGates] = useState<GateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateMode, setGateMode] = useState<"OPEN" | "CURFEW" | "MAINTENANCE">("OPEN");
  const [lockdown, setLockdown] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<Record<string, number>>({});
  const [updatingMode, setUpdatingMode] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token ?? ""}` };
      const [gatesRes, modeRes, occRes, lockRes] = await Promise.all([
        fetch("/api/gates", { headers, cache: "no-store" }).catch(() => null),
        fetch("/api/operator/mode", { cache: "no-store" }).catch(() => null),
        fetch("/api/occupancy/presence-matrix", { headers, cache: "no-store" }).catch(() => null),
        fetch("/api/lockdown/active", { headers, cache: "no-store" }).catch(() => null),
      ]);

      if (gatesRes?.ok) {
        const body = await gatesRes.json().catch(() => null);
        const list: GateInfo[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        const supervised = user?.supervisedGates;
        const filtered =
          Array.isArray(supervised) && supervised.length > 0
            ? list.filter((g) => supervised.includes(g.id))
            : list;
        setGates(filtered);
      }

      if (modeRes?.ok) {
        const json = await modeRes.json().catch(() => null);
        if (json?.data?.mode) setGateMode(json.data.mode);
      }

      if (occRes?.ok) {
        const json = await occRes.json().catch(() => null);
        const matrix = json?.data?.matrix ?? {};
        const occMap: Record<string, number> = {};
        for (const [gid, roles] of Object.entries(matrix)) {
          occMap[gid] = Object.values(roles as Record<string, number>).reduce((a, b) => a + b, 0);
        }
        setOccupancy(occMap);
      }

      if (lockRes?.ok) {
        const json = await lockRes.json().catch(() => null);
        setLockdown(json?.data ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [token, user?.supervisedGates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  usePolling(fetchData, { intervalMs: 15_000 });

  const handleSetMode = async (newMode: "OPEN" | "CURFEW" | "MAINTENANCE") => {
    if (newMode === gateMode || updatingMode) return;
    setUpdatingMode(true);
    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` };
      const res = await fetch("/api/operator/mode", {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: newMode, reason: `Set by supervisor ${user?.name || ""}` }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setGateMode(newMode);
      }
    } finally {
      setUpdatingMode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Live Multi-Gate Operations Wall</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Real-time telemetry and supervisory control across all monitored access terminals.
          </p>
        </div>

        {/* Global Gate Mode Controls */}
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-1.5 rounded-2xl border border-[var(--border)]">
          <button
            type="button"
            disabled={updatingMode}
            onClick={() => handleSetMode("OPEN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              gateMode === "OPEN"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            OPEN
          </button>
          <button
            type="button"
            disabled={updatingMode}
            onClick={() => handleSetMode("CURFEW")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              gateMode === "CURFEW"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            CURFEW
          </button>
          <button
            type="button"
            disabled={updatingMode}
            onClick={() => handleSetMode("MAINTENANCE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              gateMode === "MAINTENANCE"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            MAINTENANCE
          </button>
        </div>
      </div>

      {lockdown && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0 text-rose-400" />
          <div>
            <p className="text-xs font-bold text-rose-200">CAMPUS LOCKDOWN ACTIVE</p>
            <p className="text-[11px] text-rose-300/80">{lockdown.reason || "All gate access halted by administration."}</p>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : gates.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-12 text-center text-sm text-[var(--text-muted)]">
          No gates found under your supervision.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gates.map((g) => {
            const active = g.is_active !== false && g.isActive !== false;
            const code = g.gateCode || g.gate_code || g.id;
            const insideCount = occupancy[g.id] ?? 0;

            return (
              <div
                key={g.id}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-5 hover:border-[var(--border-strong)] transition"
              >
                {/* Gate Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20">
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">{g.name}</h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">{code}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                      !active
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : gateMode === "MAINTENANCE"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : gateMode === "CURFEW"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {!active ? "DECOMMISSIONED" : gateMode}
                  </span>
                </div>

                {/* Gate Stats */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block">
                      Occupancy Influence
                    </span>
                    <span className="text-base font-bold text-sky-400 font-mono">
                      {insideCount} <span className="text-[11px] font-normal text-[var(--text-muted)]">on campus</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block">
                      Audience Scope
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-secondary)] capitalize">
                      {g.audience || "All Campus"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                  <Link
                    href={`/supervisor/gates`}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-bold text-center hover:bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Mint Code</span>
                  </Link>

                  <Link
                    href={`/gate/${code}`}
                    className="py-2 px-3 rounded-xl bg-[var(--action-primary)] text-white text-xs font-bold hover:opacity-95 flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <span>Desk</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SupervisorGateWallPage() {
  return (
    <AuthGuard allowedRoles={["supervisor", "admin", "sysadmin"]}>
      <SupervisorGateWallInner />
    </AuthGuard>
  );
}
