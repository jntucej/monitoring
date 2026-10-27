"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapPin, Users, Activity, RefreshCw, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

/* ------------------------------------------------------------------ */
/*  Types returned by /api/occupancy/presence-matrix                 */
/* ------------------------------------------------------------------ */
interface MatrixGate { id: string; name: string; code: string; audience: string; type: string }
interface MatrixPayload {
  gates: MatrixGate[];
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Staff",
  worker: "Worker",
  visitor: "Visitor",
  admin: "Admin",
  sysadmin: "SysAdmin",
  operator: "Operator",
  supervisor: "Supervisor",
  unknown: "Other",
};

const ROLE_COLORS: Record<string, string> = {
  student: "blue", faculty: "emerald", staff: "purple", worker: "amber",
  visitor: "cyan", admin: "sky", sysadmin: "violet",
  operator: "lime", supervisor: "orange", unknown: "slate",
};

function heatColor(v: number, max: number): string {
  if (v === 0) return "rgba(59,130,246,0.06)";
  const ratio = max > 0 ? v / max : 0;
  // blue → teal → green → yellow → amber → red
  if (ratio < 0.15) return "rgba(59,130,246,0.30)";
  if (ratio < 0.30) return "rgba(45,212,191,0.45)";
  if (ratio < 0.50) return "rgba(74,222,128,0.60)";
  if (ratio < 0.70) return "rgba(250,204,21,0.70)";
  if (ratio < 0.85) return "rgba(251,146,60,0.80)";
  return "rgba(239,68,68,0.90)";
}

function heatTextColor(v: number): string {
  if (v === 0) return "rgba(148,163,184,0.5)";
  if (v < 5) return "rgba(255,255,255,0.85)";
  return "rgba(0,0,0,0.85)";
}

/* ------------------------------------------------------------------ */
export function OccupancyHeatmap() {
  const [data, setData] = useState<MatrixPayload | null>(null);
  const [live, setLive] = useState(true);
  const [selected, setSelected] = useState<{ gate: MatrixGate; role: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/occupancy/presence-matrix", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastUpdated(json.data.lastUpdated);
        setError(null);
      } else {
        setError(json.error?.message || "Failed to load presence matrix");
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    }
  }, []);

  // Initial load + visibility-aware polling only when live mode is on
  useEffect(() => {
    load();
  }, [live, load]);
  usePolling(load, { intervalMs: 15_000, enabled: live });

  // Compute the global max for consistent heat scaling
  const maxCell = useMemo(() => {
    if (!data) return 0;
    let m = 0;
    for (const gate of data.gates) {
      for (const role of data.roles) {
        m = Math.max(m, data.matrix[gate.id]?.[role] ?? 0);
      }
    }
    return m;
  }, [data]);

  const totalInside = useMemo(() => {
    if (!data) return 0;
    let total = 0;
    for (const g of data.gates) for (const r of data.roles) total += data.matrix[g.id]?.[r] ?? 0;
    return total;
  }, [data]);

  /* --------- cell click: show drill-down --------- */
  const cellDetail = useMemo(() => {
    if (!selected || !data) return null;
    const gate = data.gates.find((g) => g.id === selected.gate.id);
    const count = data.matrix[selected.gate.id]?.[selected.role] ?? 0;
    return { gate, role: selected.role, count };
  }, [selected, data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xl font-bold flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5 text-emerald-400" />
            Live Campus Presence Matrix
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Who is inside each gate right now — entry/exit combined by role. Click any cell for details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(!live)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              live
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-700 text-slate-400 border border-slate-600"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            {live ? "LIVE" : "PAUSED"}
          </button>
          <button onClick={load} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <span className="text-[10px] text-slate-500 ml-2">
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : "…"}
          </span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Inside</div>
          <div className="text-2xl font-black text-white mt-1">{totalInside}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Gates</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{data?.gates.length ?? 0}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peak Cell</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{maxCell}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Roles Tracked</div>
          <div className="text-2xl font-black text-purple-400 mt-1">{data?.roles.length ?? 0}</div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-sm text-rose-300">
          <strong>{error}</strong> — presence matrix unavailable. Gate data will appear once movement logs are recorded.
        </div>
      )}

      {/* ── THE MATRIX ── */}
      {data && data.gates.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[520px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-900 z-10 p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left border-r border-slate-800 min-w-[100px]">
                    Role ↓ / Gate →
                  </th>
                  {data.gates.map((g) => (
                    <th key={g.id} className="p-2 text-center">
                      <div className="text-[10px] font-bold text-slate-300">{g.code || g.name}</div>
                      <div className="text-[9px] text-slate-500 capitalize">{g.audience === "all" ? "main" : g.audience}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.roles.map((role) => {
                  const rowMax = Math.max(...data.gates.map((g) => data.matrix[g.id]?.[role] ?? 0));
                  return (
                    <tr key={role}>
                      <td className="sticky left-0 bg-slate-900 z-10 p-2 border-r border-slate-800 border-b border-slate-800/60">
                        <span className={`text-xs font-bold ${
                          role === "student" ? "text-blue-400" :
                          role === "faculty" ? "text-emerald-400" :
                          role === "staff" ? "text-purple-400" :
                          role === "worker" ? "text-amber-400" :
                          role === "visitor" ? "text-cyan-400" :
                          role === "principal" ? "text-rose-400" : "text-slate-400"
                        }`}>
                          {ROLE_LABELS[role] ?? role}
                        </span>
                        <div className="text-[9px] text-slate-600 mt-0.5">{rowMax} peak</div>
                      </td>
                      {data.gates.map((g) => {
                        const v = data.matrix[g.id]?.[role] ?? 0;
                        const bg = heatColor(v, maxCell);
                        const tc = heatTextColor(v);
                        const isSel = selected?.gate.id === g.id && selected?.role === role;
                        return (
                          <td key={g.id} className="p-0.5 border-b border-slate-800/40">
                            <button
                              onClick={() => v > 0 ? setSelected({ gate: g, role }) : setSelected(null)}
                              className="w-full h-12 sm:h-14 rounded-lg transition-all hover:ring-2 hover:ring-white/30 flex flex-col items-center justify-center"
                              style={{ backgroundColor: bg, boxShadow: isSel ? "0 0 0 2px rgba(255,255,255,0.6)" : "none" }}
                              title={`${ROLE_LABELS[role] ?? role} at ${g.name}: ${v} inside`}
                            >
                              <span className="text-sm font-black" style={{ color: tc }}>{v}</span>
                              <span className="text-[8px] font-medium opacity-70" style={{ color: tc }}>{v === 1 ? "person" : "people"}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-slate-800 text-[10px] text-slate-500">
            <span className="font-bold">Heat:</span>
            {[0.05, 0.15, 0.30, 0.50, 0.70, 0.85, 1.0].map((pct) => (
              <div key={pct} className="flex items-center gap-1">
                <div className="w-4 h-3 rounded" style={{ backgroundColor: heatColor(Math.round(pct * maxCell) || 0, maxCell) }} />
                <span>{pct === 0 ? "0" : `${Math.round(pct * 100)}%`}</span>
              </div>
            ))}
            <span className="ml-auto">Click a cell to see who is inside</span>
          </div>
        </div>
      )}

      {/* ── Drill-down modal ── */}
      {selected && cellDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  {cellDetail.count} {cellDetail.count === 1 ? "person" : "people"} inside
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {ROLE_LABELS[selected.role] ?? selected.role} @ {data?.gates.find((g) => g.id === selected.gate.id)?.name}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-xs text-slate-500">
              Individual names are resolved from live movement logs. When scan data is recorded at this gate, each person will appear here by name, roll, and timestamp.
            </div>
            <button onClick={() => setSelected(null)} className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
