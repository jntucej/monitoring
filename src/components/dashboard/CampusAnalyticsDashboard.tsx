"use client";

import React, { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { TelemetryKpiCard, UnifiedWorkspaceFrame } from "@/components/dashboard/UnifiedDashboardWidgets";
import type { KpiTone } from "@/lib/org-map-adapters";
import { BarChart3, Users, Activity, ArrowRight } from "lucide-react";

type Surface = "all" | "student" | "faculty" | "approver" | "operator" | "admin";
type Timeframe = "24h" | "7d" | "30d";

interface CampusAnalyticsPayload {
  surface: Surface;
  timeframe: Timeframe;
  people: {
    total: number;
    scoped: number;
    students: number;
    faculty: number;
    staff: number;
  };
  kpis: Array<{
    label: string;
    value: string;
    delta: string;
    tone: KpiTone;
    sub: string;
  }>;
  hourlyBars: Array<{ hour: number; label: string; count: number }>;
  topDepts: Array<{ name: string; count: number; pct: number }>;
  topActions: Array<{ action: string; count: number }>;
  funnel: Array<{ step: string; count: number }>;
  collectedAt: string;
}

const SURFACES: Array<{ id: Surface; label: string }> = [
  { id: "all", label: "All Campus" },
  { id: "student", label: "Students" },
  { id: "faculty", label: "Faculty" },
  { id: "approver", label: "Approvers" },
  { id: "operator", label: "Gate Ops" },
  { id: "admin", label: "Admins" },
];

const TIMEFRAMES: Array<{ id: Timeframe; label: string }> = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
];

export function CampusAnalyticsDashboard({
  defaultSurface = "all",
}: {
  defaultSurface?: Surface;
}) {
  const [surface, setSurface] = useState<Surface>(defaultSurface);
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");

  const res = useApiResource<{ success: boolean; data: CampusAnalyticsPayload }>(
    `/api/analytics/campus?surface=${surface}&timeframe=${timeframe}`
  );
  const data = res.data?.data;
  const maxHour = Math.max(...(data?.hourlyBars.map((b) => b.count) ?? [1]), 1);
  const maxFunnel = Math.max(...(data?.funnel.map((f) => f.count) ?? [1]), 1);

  return (
    <UnifiedWorkspaceFrame className="p-5 space-y-5">
      {/* Header + Surface & Timeframe Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Campus Analytics & People Telemetry
            </h2>
            <p className="text-xs text-neutral-500">
              Live headcount, 24h gate/workflow activity, department distribution & approval funnel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-neutral-100 border border-neutral-200/80">
            {SURFACES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSurface(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  surface === s.id
                    ? "bg-white text-neutral-900 font-semibold shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="inline-flex p-1 rounded-xl bg-neutral-100 border border-neutral-200/80">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  timeframe === tf.id
                    ? "bg-[#111111] text-white font-semibold shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {(data?.kpis ?? [
          { label: "Active Campus People", value: "—", delta: "loading", tone: "emerald" as const, sub: "Live directory" },
          { label: "Avg Approval Time", value: "—", delta: "loading", tone: "indigo" as const, sub: "Workflow SLA" },
          { label: "Rejection / Drop-Off", value: "—", delta: "loading", tone: "amber" as const, sub: "Completion" },
          { label: "Circulars Published", value: "—", delta: "loading", tone: "navy" as const, sub: "Notices" },
        ]).map((kpi, idx) => (
          <TelemetryKpiCard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </div>

      {/* Hourly Activity + Top Depts + Top Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 24h Hourly Activity */}
        <div className="lg:col-span-6 rounded-2xl border border-neutral-200/80 bg-[#FAFAFB] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-900">
              Hourly Campus & Workflow Activity ({timeframe})
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              {data?.people.scoped ?? 0} scoped people
            </span>
          </div>
          <div className="h-36 flex items-end gap-1 pt-2">
            {(data?.hourlyBars ?? Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, count: 0 }))).map(
              (bar) => {
                const pct = Math.max(6, Math.round((bar.count / maxHour) * 100));
                return (
                  <div
                    key={bar.hour}
                    title={`${bar.label}: ${bar.count}`}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                  >
                    <div
                      className="w-full rounded-t-sm bg-neutral-800 group-hover:bg-indigo-600 transition-colors"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              }
            )}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Top Depts & Blocks */}
        <div className="lg:col-span-3 rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900">Top Depts & Units</span>
          </div>
          <div className="space-y-2.5">
            {(data?.topDepts ?? []).map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-neutral-800 truncate">{d.name}</span>
                  <span className="font-mono text-neutral-500">{d.count}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.max(8, d.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Actions Triggered */}
        <div className="lg:col-span-3 rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900">Top Actions Triggered</span>
          </div>
          <div className="space-y-2">
            {(data?.topActions ?? []).map((a) => (
              <div
                key={a.action}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200/70 text-xs"
              >
                <span className="font-mono text-[11px] text-neutral-700 truncate">{a.action}</span>
                <span className="font-mono font-bold text-neutral-900 shrink-0">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Journey & Drop-Off Funnel */}
      <div className="rounded-2xl border border-neutral-200/80 bg-[#FAFAFB] p-4">
        <div className="text-xs font-bold text-neutral-900 mb-3">
          Operational Journey & Approval Funnel
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(data?.funnel ?? []).map((step, idx) => {
            const pct = Math.round((step.count / maxFunnel) * 100);
            return (
              <div
                key={step.step}
                className="bg-white rounded-xl border border-neutral-200/80 p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-[11px] text-neutral-500">
                    Step {idx + 1} · {pct}%
                  </div>
                  <div className="text-xs font-bold text-neutral-900 mt-0.5">{step.step}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-neutral-900">{step.count}</span>
                  {idx < 2 && <ArrowRight className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </UnifiedWorkspaceFrame>
  );
}
