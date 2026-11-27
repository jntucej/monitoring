"use client";

import React, { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { TelemetryKpiCard, UnifiedWorkspaceFrame } from "@/components/dashboard/UnifiedDashboardWidgets";
import type { KpiTone } from "@/lib/org-map-adapters";
import { BarChart3, Users, Activity, ArrowRight, Smartphone, Globe, Inbox, Info } from "lucide-react";

type Surface = "all" | "student" | "faculty" | "approver" | "operator" | "admin";
type Timeframe = "24h" | "7d" | "30d";
type FunnelTab = "gatePass" | "circularNoted" | "agentDoubt";

interface AlyzePayload {
  surface: Surface;
  timeframe: Timeframe;
  people: { total: number; students: number; faculty: number; staff: number };
  kpis: Array<{ label: string; value: string; delta: string; tone: KpiTone; sub: string }>;
  hourlyBars: Array<{ hour: number; label: string; count: number }>;
  topRoutes: Array<{ route: string; hits: number }>;
  campusZones: Array<{ id: string; label: string; scans: number | null; source: string | null }>;
  topDepts: Array<{ name: string; count: number; pct: number }>;
  entryChannels: Array<{ channel: string; pct: number | null; source: string | null }>;
  devices: { mobilePct: number | null; desktopPct: number | null; total: number };
  topActions: Array<{ action: string; count: number }>;
  browsers: Array<{ name: string; pct: number | null }> | null;
  sankey: {
    gatePass: Array<{ step: string; count: number | null; source: string | null }>;
    circularNoted: Array<{ step: string; count: number | null; source: string | null }>;
    agentDoubt: Array<{ step: string; count: number | null; source: string | null }>;
  };
  stageActions: Array<{ action: string; count: number }>;
  gates: { count: number; scanEvents: number };
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

const FUNNEL_TABS: Array<{ id: FunnelTab; label: string }> = [
  { id: "gatePass", label: "Gate Pass Funnel" },
  { id: "circularNoted", label: "Circular Noted Funnel" },
  { id: "agentDoubt", label: "Agent & Doubt Funnel" },
];

function NoDataBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
      <Inbox className="w-3 h-3" />
      {children}
    </span>
  );
}

export function CampusAnalyticsDashboard({
  defaultSurface = "all",
}: {
  defaultSurface?: Surface;
}) {
  const [surface, setSurface] = useState<Surface>(defaultSurface);
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [funnelTab, setFunnelTab] = useState<FunnelTab>("gatePass");

  const res = useApiResource<{ success: boolean; data: AlyzePayload }>(
    `/api/admin/analytics/alyze?surface=${surface}&timeframe=${timeframe}`
  );
  const data = res.data?.data;
  const maxHour = Math.max(...(data?.hourlyBars.map((b) => b.count) ?? [1]), 1);
  const hasAnyHourly = (data?.hourlyBars ?? []).some((b) => b.count > 0);

  // Max across the funnel, ignoring null steps.
  const activeFunnel = data?.sankey?.[funnelTab] ?? [];
  const maxFunnel = Math.max(...activeFunnel.map((f) => (typeof f.count === "number" ? f.count : 0)), 1);

  return (
    <UnifiedWorkspaceFrame className="p-5 space-y-5">
      {/* Header + Surface & Timeframe Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Campus Analytics &amp; People Telemetry
            </h2>
            <p className="text-xs text-neutral-500">
              KPIs, 24h activity, gate zone scans, audit actions &amp; 4-step Sankey funnels
              <span className="ml-2 font-mono text-[10px] text-neutral-400">
                {data ? `collected ${new Date(data.collectedAt).toLocaleTimeString()}` : "loading…"}
              </span>
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
                    ? "bg-neutral-900 text-white font-semibold shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {(data?.kpis ?? [
          { label: "Active Sessions & People", value: "—", delta: "loading", tone: "emerald" as const, sub: "Live directory" },
          { label: "Avg Approval Time", value: "—", delta: "loading", tone: "indigo" as const, sub: "Workflow SLA" },
          { label: "Drop-Off / Rejection", value: "—", delta: "loading", tone: "amber" as const, sub: "Completion" },
          { label: "Circulars Published", value: "—", delta: "loading", tone: "navy" as const, sub: "Notices" },
          { label: "Agent & Chat Actions", value: "—", delta: "loading", tone: "indigo" as const, sub: "Audited" },
          { label: "Friction & Retries", value: "—", delta: "loading", tone: "emerald" as const, sub: "Monitored" },
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
        <div className="lg:col-span-6 rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-900">
              Hourly Permission Activity ({timeframe})
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              {data?.people.total ?? 0} active people
            </span>
          </div>
          {hasAnyHourly ? (
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
                        style={{ height: `${pct}%`, opacity: bar.count === 0 ? 0.25 : 1 }}
                      />
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-neutral-400 text-xs">
              <NoDataBadge>No permission activity in the last {timeframe}</NoDataBadge>
            </div>
          )}
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900">Top Depts &amp; Units</span>
          </div>
          {data?.topDepts && data.topDepts.length > 0 ? (
            <div className="space-y-2.5">
              {data.topDepts.map((d) => (
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
          ) : (
            <div className="text-xs text-neutral-400">
              <NoDataBadge>No active users by department</NoDataBadge>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900">Top Actions Triggered</span>
          </div>
          {data?.topActions && data.topActions.length > 0 ? (
            <div className="space-y-2">
              {data.topActions.map((a) => (
                <div
                  key={a.action}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200/70 text-xs"
                >
                  <span className="font-mono text-[11px] text-neutral-700 truncate">{a.action}</span>
                  <span className="font-mono font-bold text-neutral-900 shrink-0">{a.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-neutral-400">
              <NoDataBadge>No audit events in the {timeframe} window</NoDataBadge>
            </div>
          )}
        </div>
      </div>

      {/* Entry Channels + Device/OS Split + Client/Browser Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="text-xs font-bold text-neutral-900 mb-3">Entry Channels</div>
          {data?.entryChannels && data.entryChannels.length > 0 ? (
            <div className="space-y-2">
              {data.entryChannels.map((c) => (
                <div key={c.channel} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700">{c.channel}</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {c.pct === null ? "—" : `${c.pct}%`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Entry channel telemetry is not tracked yet.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Smartphone className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900">Device &amp; OS Split</span>
          </div>
          {data?.devices && data.devices.total > 0 ? (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-center">
                <div className="text-lg font-bold font-mono text-neutral-900">
                  {data.devices.mobilePct === null ? "—" : `${data.devices.mobilePct}%`}
                </div>
                <div className="text-[11px] text-neutral-500">Mobile</div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-center">
                <div className="text-lg font-bold font-mono text-neutral-900">
                  {data.devices.desktopPct === null ? "—" : `${data.devices.desktopPct}%`}
                </div>
                <div className="text-[11px] text-neutral-500">Desktop / Kiosk</div>
              </div>
              <div className="text-[10px] font-mono text-neutral-400 self-end pb-1">{data.devices.total} sessions</div>
            </div>
          ) : (
            <div className="text-xs text-neutral-400">
              <NoDataBadge>No session user-agent telemetry</NoDataBadge>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Globe className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-xs font-bold text-neutral-900">Client / Browser Breakdown</span>
          </div>
          {data?.browsers && data.browsers.length > 0 ? (
            <div className="space-y-2">
              {data.browsers.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700">{b.name}</span>
                  <span className="font-mono font-semibold text-neutral-900">
                    {b.pct === null ? "—" : `${b.pct}%`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-neutral-400">
              <NoDataBadge>No session user-agent telemetry</NoDataBadge>
            </div>
          )}
        </div>
      </div>

      {/* Real gate zone scans (when available) */}
      {data && data.campusZones.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-900">
              Gate Zone Scans ({data.campusZones.length} zones, {data.gates?.scanEvents ?? 0} device events)
            </span>
            <span className="text-[11px] font-mono text-neutral-400">{data.gates?.count ?? 0} gates registered</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.campusZones.map((z) => (
              <div key={z.id} className="bg-white rounded-xl border border-neutral-200/80 p-3">
                <div className="text-[11px] text-neutral-500">{z.label}</div>
                <div className="mt-1 text-lg font-bold font-mono text-neutral-900">
                  {z.scans === null ? "—" : z.scans}
                </div>
                <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  {z.source ?? "no source"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Tab Switchable 4-Step Sankey Funnel */}
      <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-neutral-900">
            Operational Journey &amp; Drop-Off Funnel (4-Step)
          </div>
          <div className="inline-flex p-1 rounded-xl bg-white border border-neutral-200/80">
            {FUNNEL_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFunnelTab(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  funnelTab === t.id
                    ? "bg-neutral-900 text-white font-semibold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeFunnel.map((step, idx) => {
            const isNull = step.count === null;
            const pct = isNull ? 0 : Math.round(((step.count ?? 0) / maxFunnel) * 100);
            return (
              <div
                key={step.step}
                className={`bg-white rounded-xl border p-3 flex items-center justify-between gap-2 ${
                  isNull ? "border-dashed border-neutral-300 bg-neutral-50" : "border-neutral-200/80"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-neutral-500">
                    Step {idx + 1} {isNull ? "· not tracked" : `· ${pct}%`}
                  </div>
                  <div className="text-xs font-bold text-neutral-900 mt-0.5 truncate">{step.step}</div>
                  {isNull && (
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">no telemetry source</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-lg font-bold font-mono ${isNull ? "text-neutral-300" : "text-neutral-900"}`}>
                    {isNull ? "—" : step.count}
                  </span>
                  {idx < activeFunnel.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400 hidden lg:block" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real stage-action distribution */}
        {data?.stageActions && data.stageActions.length > 0 && (
          <div className="border-t border-neutral-200/70 pt-3">
            <div className="text-[11px] font-bold text-neutral-700 mb-2">
              Stage History Actions (last {timeframe})
            </div>
            <div className="flex flex-wrap gap-2">
              {data.stageActions.map((a) => (
                <span
                  key={a.action}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200/70 text-[11px] font-mono"
                >
                  <span className="text-neutral-600">{a.action}</span>
                  <span className="font-bold text-neutral-900">{a.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </UnifiedWorkspaceFrame>
  );
}
