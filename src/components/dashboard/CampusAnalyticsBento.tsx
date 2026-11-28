"use client";

import React, { useState } from "react";
import {
  ScanLine,
  Clock3,
  UserX,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Route,
  Building,
  LogIn,
  Smartphone,
  MousePointerClick,
  Compass,
  Code2,
  X,
  Copy,
  Check,
  Server,
  Monitor,
} from "lucide-react";
import { LiveGateCounter } from "./LiveGateCounter";
import { JntuhCampusMap, type CampusMapNode } from "./JntuhCampusMap";
import { PeakBarChart, type HourlyPeakBar } from "./PeakBarChart";
import {
  ConservedSankeyFunnel,
  type FunnelsMap,
} from "./ConservedSankeyFunnel";

export interface BentoKpi {
  title: string;
  value: string | number;
  delta?: string;
  good?: boolean;
  sub?: string;
  icon?: string;
}

export interface PillBarItem {
  label: string;
  value: number;
}

export interface DeviceOsSplit {
  mobileCount: number;
  desktopCount: number;
  mobilePct: number;
  desktopPct: number;
  os?: Array<{ name: string; pct: number; style: string; icon: string }>;
}

export interface CampusAnalyticsBentoProps {
  kpis?: BentoKpi[];
  peaks?: HourlyPeakBar[];
  mapNodes?: CampusMapNode[];
  funnels?: FunnelsMap;
  topRoutes?: PillBarItem[];
  topDepts?: PillBarItem[];
  entryChannels?: PillBarItem[];
  devices?: DeviceOsSplit;
  topActions?: PillBarItem[];
  browsers?: PillBarItem[];
  sseEndpoint?: string;
  isSysadmin?: boolean;
  onInspect?: (section: string, payload?: unknown) => void;
  timeframeLabel?: string;
}

export function CampusAnalyticsBento({
  kpis = [],
  peaks = [],
  mapNodes = [],
  funnels,
  topRoutes = [],
  topDepts = [],
  entryChannels = [],
  devices,
  topActions = [],
  browsers = [],
  sseEndpoint = "/api/gate/stream",
  isSysadmin = false,
  onInspect,
  timeframeLabel = "24h",
}: CampusAnalyticsBentoProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Default fallback KPIs matching the 6-KPI strip contract
  const renderedKpis: BentoKpi[] =
    kpis.length >= 6
      ? kpis.slice(0, 6)
      : [
          {
            title: "Active Sessions & Scans",
            value: "3,641",
            delta: "+9.2%",
            good: true,
            sub: "Gate QR / RFID entries",
            icon: "scan-line",
          },
          {
            title: "Avg. Session / Approval",
            value: "2m 14s",
            delta: "-4.1%",
            good: true,
            sub: "Pass consent to approval",
            icon: "clock-3",
          },
          {
            title: "Drop-Off / Rejection",
            value: "11.4%",
            delta: "-1.2%",
            good: true,
            sub: "Expired or denied passes",
            icon: "user-x",
          },
          {
            title: "Circulars Noted Rate",
            value: "92.4%",
            delta: "+2.4%",
            good: true,
            sub: "Verified student ack",
            icon: "check-circle-2",
          },
          {
            title: "Form & @agent Actions",
            value: "1,280",
            delta: "+14.5%",
            good: true,
            sub: "@agent tool hits",
            icon: "sparkles",
          },
          {
            title: "Friction & Failed Scans",
            value: "64",
            delta: "-6.4%",
            good: true,
            sub: "Rage clicks · QR fail",
            icon: "alert-triangle",
          },
        ];

  const getKpiIcon = (name?: string) => {
    switch (name) {
      case "clock-3":
        return <Clock3 className="w-3.5 h-3.5" />;
      case "user-x":
        return <UserX className="w-3.5 h-3.5" />;
      case "check-circle-2":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "sparkles":
        return <Sparkles className="w-3.5 h-3.5" />;
      case "alert-triangle":
        return <AlertTriangle className="w-3.5 h-3.5" />;
      default:
        return <ScanLine className="w-3.5 h-3.5" />;
    }
  };

  const renderPillBars = (
    items: PillBarItem[],
    gradClass: string,
    emptyText: string,
    compact = false
  ) => {
    if (items.length === 0) {
      return (
        <div className="text-xs text-slate-400 italic py-4 text-center">
          {emptyText}
        </div>
      );
    }
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    const minVal = Math.min(...items.map((i) => i.value), 0);
    const hClass = compact ? "h-7" : "h-8";

    return (
      <div className="space-y-2.5 flex-1 flex flex-col justify-center">
        {items.map((item) => {
          const norm =
            maxVal === minVal ? 1 : (item.value - minVal) / (maxVal - minVal);
          const widthPct = Math.round(44 + norm * 38);
          return (
            <div
              key={item.label}
              className={`relative w-full ${hClass} rounded-full bg-[#F1F5F9] flex items-center justify-between pr-2 overflow-hidden group select-none`}
            >
              <div
                className={`${gradClass} pill-fill h-full rounded-full flex items-center px-3 min-w-[44%] group-hover:brightness-105 transition-all`}
                style={{ width: `${widthPct}%` }}
              >
                <span className="text-[11.5px] font-semibold text-white truncate">
                  {item.label}
                </span>
              </div>
              <span className="shrink-0 ml-2 text-[11px] font-bold text-slate-700 tabular-nums">
                {item.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(
        "GET /api/admin/analytics/alyze?surface=all&timeframe=24h"
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-900">
      {/* Live Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Isolated SSE Counter */}
          <LiveGateCounter endpoint={sseEndpoint} label="Live Campus Traffic:" />

          {/* Health Probes Excluded */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/70 border border-emerald-200/60 text-[11.5px] font-medium text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Health Probes Excluded{" "}
              <span className="hidden sm:inline text-emerald-600/80">
                (Uptime Kuma · /api/me/health)
              </span>
            </span>
          </div>

          {/* Aggregated Zero PII */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-500">
            <span>Aggregated · Zero PII/UUIDs</span>
          </div>
        </div>

        {/* Sysadmin-Only Endpoint Preview Chip */}
        {isSysadmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(true);
                onInspect?.("endpoint_preview");
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-orange-300 text-[11px] font-semibold text-slate-600 hover:text-[#FF6B2C] transition-colors shadow-2xs"
            >
              <Code2 className="w-3.5 h-3.5 text-[#FF6B2C]" />
              <span>Endpoint Preview</span>
            </button>
          </div>
        )}
      </div>

      {/* 6-KPI STRIP */}
      <section
        aria-label="Campus KPIs"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5"
      >
        {renderedKpis.map((k, i) => (
          <div
            key={k.title + i}
            onClick={() => onInspect?.("kpi", k)}
            className="bento-card p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6B2C] flex items-center justify-center shrink-0">
                {getKpiIcon(k.icon)}
              </span>
              <span className="text-[11.5px] font-semibold text-slate-500 leading-tight line-clamp-2">
                {k.title}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1.5">
                <span className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                  {typeof k.value === "number"
                    ? k.value.toLocaleString()
                    : k.value}
                </span>
                {k.delta && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                      k.good !== false
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {k.delta}
                  </span>
                )}
              </div>
              {k.sub && (
                <p className="text-[10.5px] text-slate-400 font-medium mt-1 truncate">
                  {k.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ROW 1: 24h Peak Bar Chart (8 COLS) + Most Used Routes (4 COLS) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <PeakBarChart
            bars={peaks}
            timeframeLabel={timeframeLabel}
            onSelectHour={(h) => onInspect?.("hourly_bar", h)}
          />
        </div>

        <div className="bento-card p-5 lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6B2C] flex items-center justify-center">
                <Route className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-bold text-slate-900">Most Used Routes</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Hits</span>
          </div>
          {renderPillBars(
            topRoutes,
            "bg-gradient-to-r from-[#FF551A] to-[#FF844B]",
            "No audit routes recorded"
          )}
        </div>
      </section>

      {/* ROW 2: JNTUH UCEJ Campus Spatial Map + Top Depts & Blocks + Entry Channels */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr_1fr] gap-4">
        <div>
          <JntuhCampusMap
            nodes={mapNodes}
            onSelectNode={(id) => onInspect?.("campus_zone", id)}
          />
        </div>

        <div className="bento-card p-5 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center">
                <Building className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-bold text-slate-900">Top Depts &amp; Blocks</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Active</span>
          </div>
          {renderPillBars(
            topDepts,
            "bg-gradient-to-r from-[#3B82F6] to-[#4F7DF3]",
            "No department activity"
          )}
        </div>

        <div className="bento-card p-5 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center">
                <LogIn className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-bold text-slate-900">Entry Channels</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Sessions</span>
          </div>
          {renderPillBars(
            entryChannels,
            "bg-gradient-to-r from-[#10B981] to-[#22C55E]",
            "Entry channels telemetry not tracked yet"
          )}
        </div>
      </section>

      {/* ROW 3: Device & OS Split + Top Actions + Client / Browser Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Device & OS Split */}
        <div className="bento-card p-5 flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-bold text-slate-900">Device &amp; OS Split</h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Mobile-First
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                <Smartphone className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Mobile</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[21px] font-extrabold text-slate-900 tabular-nums leading-none">
                  {(devices?.mobileCount ?? 2840).toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-[#3B82F6] tabular-nums">
                  {devices?.mobilePct ?? 78}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#4F7DF3] transition-all duration-500"
                  style={{ width: `${devices?.mobilePct ?? 78}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 border-l border-slate-200/80 pl-3">
              <div className="flex items-center justify-end gap-1.5 text-[11.5px] font-semibold text-slate-500">
                <Monitor className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Desktop / Kiosk</span>
              </div>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-[21px] font-extrabold text-slate-900 tabular-nums leading-none">
                  {(devices?.desktopCount ?? 801).toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-[#10B981] tabular-nums">
                  {devices?.desktopPct ?? 22}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden flex justify-end">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#22C55E] transition-all duration-500"
                  style={{ width: `${devices?.desktopPct ?? 22}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Operating System
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                devices?.os ?? [
                  {
                    name: "Android",
                    pct: 56,
                    style: "bg-gradient-to-r from-[#10B981] to-[#22C55E]",
                    icon: "smartphone",
                  },
                  {
                    name: "Windows",
                    pct: 18,
                    style: "bg-gradient-to-r from-[#3B82F6] to-[#4F7DF3]",
                    icon: "monitor",
                  },
                  {
                    name: "iOS",
                    pct: 22,
                    style: "bg-gradient-to-r from-[#1E1B4B] to-[#312E81]",
                    icon: "smartphone",
                  },
                  {
                    name: "Linux/Other",
                    pct: 4,
                    style: "bg-slate-700",
                    icon: "monitor",
                  },
                ]
              ).map((item) => (
                <div
                  key={item.name}
                  className={`${item.style} h-9 rounded-full px-3 flex items-center justify-between shadow-2xs hover:brightness-105 transition-all text-white`}
                >
                  <span className="flex items-center gap-1.5 text-[11.5px] font-semibold truncate">
                    {item.icon === "monitor" ? (
                      <Monitor className="w-3.5 h-3.5 opacity-90 shrink-0" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 opacity-90 shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-extrabold text-slate-800 tabular-nums shrink-0 ml-1">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Actions Triggered */}
        <div className="bento-card p-5 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center">
                <MousePointerClick className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-bold text-slate-900">
                Top Actions Triggered
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Events</span>
          </div>
          {renderPillBars(
            topActions,
            "bg-gradient-to-r from-[#3B82F6] to-[#4F7DF3]",
            "No audit events triggered",
            true
          )}
        </div>

        {/* Client / Browser Breakdown */}
        <div className="bento-card p-5 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center">
                <Compass className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-bold text-slate-900">
                Client / Browser Breakdown
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Clients</span>
          </div>
          {renderPillBars(
            browsers,
            "bg-gradient-to-r from-[#10B981] to-[#22C55E]",
            "No browser telemetry available"
          )}
        </div>
      </section>

      {/* BOTTOM FULL-WIDTH: 4-Step Conserved Sankey Funnel */}
      <ConservedSankeyFunnel funnels={funnels} />

      {/* Admin Diagnostic Endpoint Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-xl w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF6B2C] flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold text-slate-900">
                    Aggregated Analytics Endpoint Preview
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Single round-trip query powering all dashboard widgets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11.5px] flex items-center justify-between gap-2 overflow-x-auto">
              <code className="whitespace-nowrap text-emerald-300">
                GET /api/admin/analytics/alyze?surface=all&amp;timeframe=24h
              </code>
              <button
                type="button"
                onClick={handleCopyEndpoint}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-sans font-semibold text-white transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                <span>Response Payload Schema (Zero PII / UUIDs)</span>
                <span className="text-emerald-600">200 OK · Backed by PostgreSQL</span>
              </div>
              <pre className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-700 overflow-x-auto max-h-56 leading-relaxed">
{JSON.stringify(
  {
    meta: {
      route: "/admin/analytics",
      piiRedacted: true,
      healthProbesExcluded: ["/api/me/health", "Uptime-Kuma/*"],
    },
    kpis: renderedKpis.map((k) => ({
      title: k.title,
      value: k.value,
      delta: k.delta,
    })),
    hourlyBars: `[24 intervals · max=${peaks.length ? Math.max(...peaks.map((b) => b.count)) : 0}]`,
    topRoutes: topRoutes.slice(0, 3),
    campusZones: `${mapNodes.length || 9} JNTUH UCEJ zones`,
    sankey: {
      activeTab: "gate_pass",
      flowConserved: true,
    },
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
