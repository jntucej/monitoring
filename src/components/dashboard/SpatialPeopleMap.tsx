"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApiResource } from "@/hooks/useApiResource";
import {
  AREA_ADAPTERS,
  HUES,
  type AreaAdapter,
  type AreaId,
  type NodeStatus,
  type SpatialDeepLink,
  type SpatialNode,
} from "@/lib/org-map-adapters";

const LAYOUT_MS = 720;
const MORPH_MS = 1150;
const INTRO_MS = 1150;
const FLASH_MS = 1600;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const Icon = ({ name, className = 'w-4 h-4' }: { name: string; className?: string }) => {
  const props: React.SVGProps<SVGSVGElement> = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  switch (name) {
    case 'orbit':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'tree':
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="5" rx="1" />
          <rect x="2" y="17" width="6" height="5" rx="1" />
          <rect x="16" y="17" width="6" height="5" rx="1" />
          <path d="M12 7v5M5 17v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'building':
      return (
        <svg {...props}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
        </svg>
      );
    case 'graduation':
      return (
        <svg {...props}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case 'home':
      return (
        <svg {...props}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...props}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'arrowRight':
      return (
        <svg {...props}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case 'external':
      return (
        <svg {...props}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    case 'swap':
      return (
        <svg {...props}>
          <path d="m16 3 4 4-4 4" />
          <path d="M20 7H4" />
          <path d="m8 21-4-4 4-4" />
          <path d="M4 17h16" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'eyeOff':
      return (
        <svg {...props}>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      );
    case 'zoomIn':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...props}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * ============================================================================
 * 5 SCOPED AREA DATA ADAPTERS (Normalized { kpis, clusters, nodes, delegations })
 * ============================================================================
 */

export interface SpatialPeopleMapWorkspaceProps {
  defaultArea?: AreaId;
  lockedArea?: boolean;
  enforceVpPrivacy?: boolean;
  compact?: boolean;
}

interface OrgMapApiResponse {
  areaId: AreaId;
  isSuperAdmin: boolean;
  vpPrivacyEnforced: boolean;
  adapter: AreaAdapter;
}

export function SpatialPeopleMapWorkspace({
  defaultArea = 'institutional',
  lockedArea = false,
  enforceVpPrivacy = false,
  compact = false,
}: SpatialPeopleMapWorkspaceProps) {
  const router = useRouter();
  const [activeAreaId, setActiveAreaId] = useState<AreaId>(defaultArea);
  // Dual-Mode Graph View ('constellation' | 'tree')
  const [layoutMode, setLayoutMode] = useState<'constellation' | 'tree'>('constellation');
  // Cluster Filter ('all' or cluster.id)
  const [clusterFilter, setClusterFilter] = useState('all');
  // Live Search Input (triggers FLASH_MS = 1600 pulse ring)
  const [searchQuery, setSearchQuery] = useState('');
  // Selected Node ID
  const [selectedNodeId, setSelectedNodeId] = useState('p_vp');
  // Area 2 Special: Zoom into 3rd Year IT-A aggregated class cluster -> individual students
  const [isClassZoomed, setIsClassZoomed] = useState(false);
  // Area 2 Special: Substitute Faculty Assignment state
  const [substituteMap, setSubstituteMap] = useState<Record<string, string>>({});
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  // Area 4 Special: VP Privacy Mode (Aggregate-only PII protection)
  const [vpPrivacyMode, setVpPrivacyMode] = useState(enforceVpPrivacy);
  // SuperAdmin UUID Visibility Toggle
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // Bidirectional Deep-Link Interactive Drawer / Toast Preview
  const [deepLinkPreview, setDeepLinkPreview] = useState<{ title: string; route: string; detail: string } | null>(null);

  const liveRes = useApiResource<{ success: boolean; data: OrgMapApiResponse }>(`/api/org-map?area=${activeAreaId}`);
  const adapter = liveRes.data?.data?.adapter ?? AREA_ADAPTERS[activeAreaId];

  // Build effective node list (handling Area 2 class zoom & substitute overrides)
  const effectiveNodes = useMemo(() => {
    let base = adapter.nodes.map((n) => {
      if (n.id === 'd_fac_absent' && substituteMap['d_fac_absent']) {
        return {
          ...n,
          substituteAssigned: substituteMap['d_fac_absent'],
          statusText: `On Medical Leave · Covered by ${substituteMap['d_fac_absent']}`,
          roleContexts: [`Sub: ${substituteMap['d_fac_absent']}`]
        };
      }
      return n;
    });

    if (activeAreaId === 'department' && isClassZoomed && adapter.zoomedStudents) {
      base = [...base, ...adapter.zoomedStudents];
    }
    return base;
  }, [adapter, activeAreaId, isClassZoomed, substituteMap]);

  // Switch Area Handler
  const handleSelectArea = (areaKey: AreaId) => {
    setActiveAreaId(areaKey);
    setClusterFilter('all');
    setSearchQuery('');
    setIsClassZoomed(false);
    setVpPrivacyMode(false);
    setSelectedNodeId(AREA_ADAPTERS[areaKey].defaultSelectedId);
  };

  // Selected Node Object
  const selectedNode = useMemo(() => {
    return effectiveNodes.find((n) => n.id === selectedNodeId) || effectiveNodes[0];
  }, [effectiveNodes, selectedNodeId]);

  // Handle Deep-Link / Action Triggers
  const handleTriggerAction = (link: SpatialDeepLink) => {
    if (link.switchArea) {
      handleSelectArea(link.switchArea);
      setDeepLinkPreview({
        title: `Switched Scoped Adapter → ${AREA_ADAPTERS[link.switchArea].title}`,
        route: link.route,
        detail: 'Shared store preserved session context across institutional & operational views.'
      });
      return;
    }
    if (link.type === 'action_zoom') {
      setIsClassZoomed((prev) => !prev);
      setDeepLinkPreview({
        title: !isClassZoomed
          ? 'Expanded 3rd Year IT-A Cluster → 60 Student Nodes (Sampled 6)'
          : 'Collapsed 3rd Year IT-A Back to Aggregate Cluster',
        route: '/faculty/class/3-IT-A?view=spatial',
        detail: 'Aggregate-first rendering keeps SVG smoothstep interpolation locked at 60fps.'
      });
      return;
    }
    if (link.type === 'action_substitute') {
      setIsSubModalOpen(true);
      return;
    }

    setDeepLinkPreview({
      title: `Navigating: ${link.label}`,
      route: link.route,
      detail: `Synced entity [${selectedNode.code}] with Gate Monitor live route.`
    });
    if (link.route && link.route.startsWith('/')) {
      router.push(link.route);
    }
  };

  return (
    <div className={compact ? "text-neutral-900 font-sans antialiased" : "min-h-screen bg-[#F5F6F7] p-2 sm:p-4 lg:p-6 text-neutral-900 font-sans antialiased selection:bg-neutral-900 selection:text-white"}>
      <div className={compact ? "bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/80 overflow-hidden flex flex-col lg:flex-row lg:min-h-[720px]" : "max-w-[1540px] mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/80 overflow-hidden flex flex-col lg:flex-row lg:min-h-[840px]"}>
      {/* =================================================================== */}
      {/* ZONE 1: LEFT NAVIGATION RAIL (Unified Reference Sidebar)            */}
      {/* =================================================================== */}
      <aside className={`${lockedArea ? "hidden lg:flex" : "flex"} w-full lg:w-64 bg-[#FAFAFB] border-b lg:border-b-0 lg:border-r border-neutral-200/80 p-3 sm:p-4 flex-col justify-between shrink-0 z-20`}>
        <div className="overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-sm">
                <Icon name="shield" className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-neutral-900">Gate Monitor</span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                    v4.2
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono">&lt;SpatialPeopleMap /&gt;</p>
              </div>
            </div>
          </div>

          {/* 5 Scoped Area Adapters Switcher */}
          {!lockedArea && (
          <div className="pb-3 border-b border-neutral-200/70">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-medium text-neutral-400">
                Scoped Adapters
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-600">28 Roles</span>
            </div>
            <div className="space-y-1">
              {Object.values(AREA_ADAPTERS).map((area) => {
                const isActive = area.id === activeAreaId;
                return (
                  <button
                    key={area.id}
                    onClick={() => handleSelectArea(area.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80 font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-200/50 font-medium'
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        isActive ? 'bg-[#111111] text-white' : 'bg-neutral-200/60 text-neutral-500'
                      }`}
                    >
                      <Icon name={area.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{area.shortTitle}</div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        {area.personaBadge}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          )}
          {/* Scoped Operational Unit Filter Tree */}
          <div className="p-3">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operational Clusters
              </span>
              {clusterFilter !== 'all' && (
                <button
                  onClick={() => setClusterFilter('all')}
                  className="text-[10px] font-semibold text-indigo-600 hover:underline"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {adapter.clusters.map((cluster) => {
                const hue = HUES[cluster.hue] || HUES.navy;
                const isSelected = clusterFilter === cluster.id;
                const count = effectiveNodes.filter((n) => n.clusterId === cluster.id).length;

                return (
                  <button
                    key={cluster.id}
                    onClick={() => setClusterFilter(isSelected ? 'all' : cluster.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'font-medium text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: hue.hex }}
                      />
                      <span className="truncate">{cluster.label}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Semantic Hue Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 px-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Semantic Hue System
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                {Object.entries(HUES)
                  .filter(([k]) => k !== 'rose')
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: val.hex }}
                      />
                      <span className="truncate">{val.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Governance Controls: Coverage Bar + SuperAdmin UUID Toggle */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2.5">
          {/* Operational Coverage Progress */}
          <div className="bg-white p-2.5 rounded-2xl border border-neutral-200/80">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-slate-700">{adapter.coverageLabel}</span>
              <span className="font-mono font-bold text-emerald-600">{adapter.coveragePct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${adapter.coveragePct}%` }}
              />
            </div>
          </div>

          {/* SuperAdmin PII / Internal UUID Visibility Toggle */}
          <label className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white border border-neutral-200/80 cursor-pointer hover:border-slate-300 transition-colors">
            <div>
              <div className="text-[11px] font-semibold text-slate-800">isSuperAdmin(role)</div>
              <div className="text-[10px] text-slate-400">Reveal internal UUIDs</div>
            </div>
            <input
              type="checkbox"
              checked={isSuperAdmin}
              onChange={(e) => setIsSuperAdmin(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MAIN WORKSPACE: MACRO KPI STRIP + MESO MAP + MICRO INSPECTOR        */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
        {/* Top Context & Role Bar */}
        <header className="bg-white border-b border-neutral-200/80 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-900">
                {adapter.title}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Scope: {adapter.personaBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{adapter.subtitle}</p>
          </div>

          {/* Area-Specific Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Area 2 Special: Zoom into Class Section Toggle */}
            {activeAreaId === 'department' && (
              <button
                onClick={() => {
                  setIsClassZoomed((prev) => !prev);
                  if (!isClassZoomed) setSelectedNodeId('d_cls_3ita');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isClassZoomed
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Icon name="zoomIn" className="w-3.5 h-3.5" />
                {isClassZoomed ? 'Collapse Class Section' : 'Zoom into 3rd Yr IT-A (60)'}
              </button>
            )}

            {/* Area 4 Special: VP Privacy Mode Toggle */}
            {activeAreaId === 'hostel' && (
              <button
                onClick={() => setVpPrivacyMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  vpPrivacyMode
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Icon name="eyeOff" className="w-3.5 h-3.5" />
                {vpPrivacyMode ? 'VP Privacy Mode: ON (Aggregate Only)' : 'Simulate VP Boundary'}
              </button>
            )}

            {/* Deep-Link Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
              <span>/api/org-map?area={activeAreaId}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Inner Workspace */}
        <main className="flex-1 p-4 lg:p-5 flex flex-col gap-4 lg:overflow-hidden">
          {/* =============================================================== */}
          {/* ZONE 2: MACRO — TOP KPI SUMMARY STRIP                           */}
          {/* =============================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 shrink-0">
            {adapter.kpis.map((kpi, idx) => {
              const badgeStyles = {
                emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
                indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
                rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
                navy: 'bg-neutral-100 text-neutral-700 border-neutral-200/80'
              }[kpi.tone];
              const barFill = {
                emerald: 'bg-emerald-600',
                amber: 'bg-amber-500',
                indigo: 'bg-indigo-600',
                rose: 'bg-rose-600',
                navy: 'bg-neutral-800'
              }[kpi.tone] || 'bg-neutral-800';
              const activeSegments = kpi.tone === 'rose' ? 2 : kpi.tone === 'amber' ? 3 : 4;

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-neutral-500 truncate">{kpi.label}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyles}`}
                    >
                      {kpi.delta}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-2 mb-3">
                    <span className="text-xl lg:text-2xl font-bold tracking-tight text-neutral-900">
                      {kpi.value}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate">{kpi.sub}</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-md overflow-hidden flex gap-[2px] p-0.5">
                    {[0, 1, 2, 3].map((seg) => (
                      <span
                        key={seg}
                        className={`flex-1 rounded-sm ${seg < activeSegments ? barFill : 'bg-neutral-200/80'}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* =============================================================== */}
          {/* LOWER SPLIT: MESO (SPATIAL CANVAS) + MICRO (RIGHT INSPECTOR)    */}
          {/* =============================================================== */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[540px] lg:min-h-0 lg:overflow-hidden">
            {/* MESO: REUSABLE <SpatialPeopleMap /> ENGINE */}
            <SpatialPeopleMap
              adapter={adapter}
              nodes={effectiveNodes}
              layoutMode={layoutMode}
              setLayoutMode={setLayoutMode}
              clusterFilter={clusterFilter}
              setClusterFilter={setClusterFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              vpPrivacyMode={vpPrivacyMode}
              isClassZoomed={isClassZoomed}
            />

            {/* MICRO: RIGHT CONTEXTUAL INSPECTOR */}
            <aside className="w-full lg:w-[340px] flex flex-col gap-3.5 shrink-0 lg:overflow-y-auto">
              {/* Inspector Card 1: Entity Identity & Live Status */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
                {vpPrivacyMode && activeAreaId === 'hostel' && selectedNode.tier >= 2 ? (
                  /* Strict VP PII Protection Boundary View */
                  <div className="py-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                      <Icon name="eyeOff" className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      VP Privacy Boundary Active
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Individual warden/caretaker & resident PII is masked for{' '}
                      <code className="font-mono text-slate-700">vice_principal</code> role. Showing
                      aggregate block KPI only:
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                      {selectedNode.aggregateSummary || 'Aggregate Hostel Block Metrics Only'}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header Identity Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-offset-2"
                          style={{
                            backgroundColor: getClusterHue(adapter, selectedNode.clusterId).hex,
                            ['--tw-ring-color' as string]: getClusterHue(adapter, selectedNode.clusterId).hex
                          }}
                        >
                          {selectedNode.initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {selectedNode.name}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">{selectedNode.role}</p>
                        </div>
                      </div>
                      <StatusBadge status={selectedNode.status} />
                    </div>

                    {/* Dual-Hat role_context & Scope Badges */}
                    {selectedNode.roleContexts && selectedNode.roleContexts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {selectedNode.roleContexts.map((ctx, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                          >
                            <Icon name="sparkles" className="w-2.5 h-2.5" />
                            {ctx}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Human Identifiers Grid (Never raw UUID unless isSuperAdmin is true) */}
                    <div className="grid grid-cols-2 gap-2.5 mt-3.5 pt-3.5 border-t border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Employee / Roll Code
                        </div>
                        <div className="font-mono font-semibold text-slate-800 mt-0.5">
                          {selectedNode.code}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Operational Scope
                        </div>
                        <div className="font-medium text-slate-700 mt-0.5 truncate" title={selectedNode.scope}>
                          {selectedNode.scope}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Live Presence Signal
                        </div>
                        <div className="font-medium text-slate-800 mt-0.5">
                          {selectedNode.statusText}
                        </div>
                      </div>

                      {/* Conditional SuperAdmin UUID Row */}
                      {isSuperAdmin && (
                        <div className="col-span-2 p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] flex items-center justify-between">
                          <span className="text-slate-400">internal_uuid:</span>
                          <span>{selectedNode.uuid}</span>
                        </div>
                      )}
                    </div>

                    {/* Today's Shift / Class Slots */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Today&apos;s Roster / Duty Slots
                      </div>
                      <div className="space-y-1.5">
                        {selectedNode.todaySchedule.map((slot, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-medium text-slate-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate">{slot}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mon–Fri Weekly Roster Strip */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Mon – Fri Roster Strip
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Week 48</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                          const val = selectedNode.weekRoster[idx] || 'On';
                          const isAlert = ['Leave', 'A', 'Handover', 'Pass'].includes(val);
                          return (
                            <div
                              key={day}
                              className={`p-1.5 rounded-lg border text-center ${
                                idx === 4
                                  ? 'border-indigo-300 bg-indigo-50/40'
                                  : 'border-slate-100 bg-slate-50/70'
                              }`}
                            >
                              <div className="text-[10px] font-semibold text-slate-500">{day}</div>
                              <div
                                className={`mt-1 text-[10px] font-mono font-bold px-1 py-0.5 rounded ${
                                  isAlert
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100/80 text-emerald-800'
                                }`}
                              >
                                {val}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bidirectional Deep-Link Action Buttons */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Bidirectional Roster & Chat Links
                      </div>
                      {selectedNode.deepLinks.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTriggerAction(link)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            idx === 0
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span className="truncate">{link.label}</span>
                          <Icon name="external" className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Inspector Card 2: Escalation Lineage Chain */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-3.5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Active Escalation & Approval Path
                </div>
                <div className="space-y-1.5">
                  {getLineageList(effectiveNodes, selectedNode.id).map((ancestor, idx, arr) => {
                    const hue = getClusterHue(adapter, ancestor.clusterId);
                    const isLast = idx === arr.length - 1;
                    return (
                      <button
                        key={ancestor.id}
                        onClick={() => setSelectedNodeId(ancestor.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          isLast
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: hue.hex }}
                          />
                          <span className="truncate">
                            {vpPrivacyMode && activeAreaId === 'hostel' && ancestor.tier >= 2
                              ? `Aggregate Unit (${ancestor.code})`
                              : ancestor.name}
                          </span>
                        </span>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            isLast ? 'text-indigo-300' : 'text-slate-400'
                          }`}
                        >
                          T{ancestor.tier}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: FLEXIBLE-CLASS SUBSTITUTE PICKER (Area 2 Integration)        */}
      {/* =================================================================== */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Flexible-Class Substitute Picker
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slot: 10:00–11:00 Compiler Design (3rd Year IT-A)
                </p>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500">
                Available IT Faculty in Period 2 (10:00 AM):
              </div>
              {[
                { name: 'Dr. Mohammed Irfan', code: 'FAC-IT-22', note: 'Free Slot · Cloud Lab Lead' },
                { name: 'Prof. Karthik Subramanian', code: 'FAC-IT-14', note: 'Class Advisor · 3rd Yr IT-A' }
              ].map((cand) => (
                <button
                  key={cand.code}
                  onClick={() => {
                    setSubstituteMap((prev) => ({ ...prev, d_fac_absent: cand.name }));
                    setIsSubModalOpen(false);
                    setDeepLinkPreview({
                      title: `Substitute Assigned: ${cand.name}`,
                      route: '/hod/schedule?updated=3-IT-A',
                      detail:
                        'Updated HOD timetable, notified 3rd Year IT-A /chat, and cleared coverage gap.'
                    });
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{cand.name}</div>
                    <div className="text-[11px] text-slate-500">{cand.note}</div>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600">Assign →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BIDIRECTIONAL DEEP-LINK ROUTE PREVIEW TOAST                         */}
      {/* =================================================================== */}
      {deepLinkPreview && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="swap" className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate">{deepLinkPreview.title}</span>
              <button
                onClick={() => setDeepLinkPreview(null)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 inline-block px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-emerald-400">
              {deepLinkPreview.route}
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              {deepLinkPreview.detail}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * REUSABLE <SpatialPeopleMap /> COMPONENT
 * Handles:
 *  - Polar Constellation vs Top-Down Org Chart layout coordinates
 *  - 60fps requestAnimationFrame Cubic Hermite Smoothstep Interpolation
 *  - Focus + Context Dimming (opacity: 0.22 on non-lineage nodes)
 *  - Dashed Delegation Arcs & Search Pulse Rings (FLASH_MS = 1600)
 * ============================================================================
 */

export interface SpatialPeopleMapProps {
  adapter: AreaAdapter;
  nodes: SpatialNode[];
  layoutMode: 'constellation' | 'tree';
  setLayoutMode: (mode: 'constellation' | 'tree') => void;
  clusterFilter: string;
  setClusterFilter: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedNodeId: string;
  setSelectedNodeId: (id: string) => void;
  vpPrivacyMode: boolean;
  isClassZoomed: boolean;
}

export function SpatialPeopleMap({
  adapter,
  nodes,
  layoutMode,
  setLayoutMode,
  clusterFilter,
  setClusterFilter,
  searchQuery,
  setSearchQuery,
  selectedNodeId,
  setSelectedNodeId,
  vpPrivacyMode,
  isClassZoomed,
}: SpatialPeopleMapProps) {
  const SVG_W = 920;
  const SVG_H = 600;

  // Interpolated positions state { [nodeId]: { x, y } }
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const posRef = useRef<Record<string, { x: number; y: number }>>({});
  const animRef = useRef<number | null>(null);

  // Camera Pan & Zoom state
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });

  // Reset camera when switching area
  useEffect(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, [adapter.id]);

  // Compute Target Coordinates for Constellation (Polar) or Org Chart (Tree)
  const targetPositions = useMemo(() => {
    const targets: Record<string, { x: number; y: number }> = {};
    const cx = SVG_W / 2;
    const cy = SVG_H / 2 + 10;

    const rootNode = nodes.find((n) => n.parentId === null) || nodes[0];
    const activeClusters =
      clusterFilter === 'all'
        ? adapter.clusters
        : adapter.clusters.filter((c) => c.id === clusterFilter);

    if (layoutMode === 'constellation') {
      // POLAR RADIAL CONSTELLATION LAYOUT
      if (rootNode) {
        targets[rootNode.id] = { x: cx, y: cy };
      }

      const nonRootClusters = activeClusters.filter((c) =>
        nodes.some((n) => n.clusterId === c.id && n.id !== rootNode?.id)
      );
      const step = (Math.PI * 2) / Math.max(nonRootClusters.length, 1);

      nonRootClusters.forEach((cluster, cIdx) => {
        const baseAngle = -Math.PI * 0.72 + cIdx * step;
        const clusterNodes = nodes.filter(
          (n) => n.clusterId === cluster.id && n.id !== rootNode?.id
        );

        const tier1Nodes = clusterNodes.filter((n) => n.tier === 1);
        const deeperNodes = clusterNodes.filter((n) => n.tier >= 2);

        const r1 = clusterFilter === 'all' ? 128 : 95;
        const r2 = clusterFilter === 'all' ? 225 : 195;

        tier1Nodes.forEach((node, idx) => {
          const spread = tier1Nodes.length > 1 ? 0.34 : 0;
          const ang =
            baseAngle +
            (tier1Nodes.length === 1 ? 0 : (idx / (tier1Nodes.length - 1) - 0.5) * spread);
          targets[node.id] = {
            x: cx + Math.cos(ang) * r1,
            y: cy + Math.sin(ang) * r1
          };
        });

        deeperNodes.forEach((node, idx) => {
          const maxFan = clusterFilter === 'all' ? Math.min(step * 0.82, 0.88) : Math.PI * 1.1;
          const ang =
            baseAngle +
            (deeperNodes.length === 1 ? 0 : (idx / (deeperNodes.length - 1) - 0.5) * maxFan);
          const tierExtra = node.tier >= 3 ? 52 : (idx % 2) * 18;
          targets[node.id] = {
            x: cx + Math.cos(ang) * (r2 + tierExtra),
            y: cy + Math.sin(ang) * (r2 + tierExtra)
          };
        });
      });

      // Tuck filtered-out nodes near center
      nodes.forEach((n) => {
        if (!targets[n.id]) targets[n.id] = { x: cx, y: cy };
      });
    } else {
      // HIERARCHICAL TOP-DOWN ORG CHART LAYOUT
      const tierY: Record<number, number> = { 0: 76, 1: 215, 2: 365, 3: 505 };
      const visibleNodes = nodes.filter(
        (n) => clusterFilter === 'all' || n.parentId === null || n.clusterId === clusterFilter
      );

      [0, 1, 2, 3].forEach((tier) => {
        const rowNodes = visibleNodes.filter((n) => n.tier === tier);
        const count = rowNodes.length;
        if (count === 0) return;

        const padX = count === 1 ? SVG_W / 2 : 84;
        const usableW = SVG_W - padX * 2;

        rowNodes.forEach((node, idx) => {
          const x = count === 1 ? SVG_W / 2 : padX + (idx / (count - 1)) * usableW;
          const staggerY = count >= 7 && idx % 2 === 1 ? 34 : 0;
          targets[node.id] = {
            x,
            y: (tierY[tier] || 365) + staggerY
          };
        });
      });

      nodes.forEach((n) => {
        if (!targets[n.id]) targets[n.id] = { x: cx, y: 215 };
      });
    }

    return targets;
  }, [nodes, adapter.clusters, layoutMode, clusterFilter]);

  // Smoothstep Interpolation Effect (60fps requestAnimationFrame)
  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const cx = SVG_W / 2;
    const cy = SVG_H / 2 + 10;

    const startMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      startMap[n.id] = posRef.current[n.id] || { x: cx, y: cy };
    });

    const duration = Object.keys(posRef.current).length === 0 ? INTRO_MS : MORPH_MS;
    const t0 = performance.now();

    const step = (now: number) => {
      const elapsed = now - t0;
      const k = smoothstep(0, duration, elapsed);
      const next: Record<string, { x: number; y: number }> = {};

      nodes.forEach((n) => {
        const s = startMap[n.id] || { x: cx, y: cy };
        const e = targetPositions[n.id] || { x: cx, y: cy };
        next[n.id] = {
          x: s.x + (e.x - s.x) * k,
          y: s.y + (e.y - s.y) * k
        };
      });

      posRef.current = next;
      setPositions(next);

      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetPositions, nodes]);

  // Lineage Set for Focus + Context Dimming (opacity: 0.22 on non-lineage nodes)
  const lineageSet = useMemo(() => {
    const set = new Set([selectedNodeId]);
    let curr = nodes.find((n) => n.id === selectedNodeId);
    while (curr && curr.parentId) {
      const pid = curr.parentId;
      set.add(pid);
      curr = nodes.find((n) => n.id === pid);
    }
    nodes.forEach((n) => {
      if (n.parentId === selectedNodeId) set.add(n.id);
    });
    return set;
  }, [nodes, selectedNodeId]);

  const searchLower = searchQuery.trim().toLowerCase();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const isNodeVisible = useCallback(
    (node: SpatialNode) => {
      if (clusterFilter === 'all') return true;
      return node.parentId === null || node.clusterId === clusterFilter;
    },
    [clusterFilter]
  );

  return (
    <section className="flex-1 bg-white rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col min-h-[340px] sm:min-h-[480px] lg:min-h-0 overflow-hidden relative">
      {/* Toolbar Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Spatial Governance Canvas</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {layoutMode === 'constellation' ? 'Polar Clusters' : 'Escalation Tree'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Click node to illuminate escalation path · Drag canvas to pan
          </p>
        </div>

        {/* Search Input + Constellation <-> Org Chart Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Search Input (triggers FLASH_MS = 1600 pulse ring) */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length >= 2) {
                  const q = val.trim().toLowerCase();
                  const hit = nodes.find(
                    (n) =>
                      isNodeVisible(n) &&
                      (n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q))
                  );
                  if (hit) setSelectedNodeId(hit.id);
                }
              }}
              placeholder="Find person or roll/emp code..."
              className="pl-8 pr-7 py-1.5 w-48 sm:w-56 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dual-Mode Segmented Toggle */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
            <button
              onClick={() => setLayoutMode('constellation')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                layoutMode === 'constellation'
                  ? 'bg-white text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-600 font-medium hover:text-slate-900'
              }`}
            >
              <Icon
                name="orbit"
                className={`w-3.5 h-3.5 ${
                  layoutMode === 'constellation' ? 'text-indigo-600' : 'text-slate-500'
                }`}
              />
              Constellation
            </button>
            <button
              onClick={() => setLayoutMode('tree')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                layoutMode === 'tree'
                  ? 'bg-white text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-600 font-medium hover:text-slate-900'
              }`}
            >
              <Icon
                name="tree"
                className={`w-3.5 h-3.5 ${
                  layoutMode === 'tree' ? 'text-indigo-600' : 'text-slate-500'
                }`}
              />
              Org chart
            </button>
          </div>
        </div>
      </div>

      {/* Cluster Filter Pills Bar */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto shrink-0 z-10">
        <button
          onClick={() => setClusterFilter('all')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 ${
            clusterFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>All Clusters</span>
          <span className="opacity-75 font-mono">{nodes.length}</span>
        </button>

        {adapter.clusters.map((cluster) => {
          const hue = HUES[cluster.hue] || HUES.navy;
          const isActive = clusterFilter === cluster.id;
          const cnt = nodes.filter((n) => n.clusterId === cluster.id).length;

          return (
            <button
              key={cluster.id}
              onClick={() => setClusterFilter(isActive ? 'all' : cluster.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hue.hex }} />
              <span>{cluster.label}</span>
              <span className="text-[10px] opacity-70 font-mono">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive SVG Canvas Viewport */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('.spatial-node')) return;
          dragRef.current = {
            active: true,
            startX: e.clientX - camera.x,
            startY: e.clientY - camera.y
          };
        }}
        onMouseMove={(e) => {
          if (!dragRef.current.active) return;
          setCamera((prev) => ({
            ...prev,
            x: e.clientX - dragRef.current.startX,
            y: e.clientY - dragRef.current.startY
          }));
        }}
        onMouseUp={() => {
          dragRef.current.active = false;
        }}
        onMouseLeave={() => {
          dragRef.current.active = false;
        }}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <style>{`
          @keyframes flashPulseRing {
            0% { transform: scale(0.95); opacity: 0.95; }
            75% { transform: scale(1.95); opacity: 0; }
            100% { transform: scale(1.95); opacity: 0; }
          }
          @keyframes dashFlow {
            to { stroke-dashoffset: -24; }
          }
          .pulse-flash-ring {
            transform-box: fill-box;
            transform-origin: center;
            animation: flashPulseRing ${FLASH_MS}ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          .delegation-arc {
            animation: dashFlow 1.4s linear infinite;
          }
        `}</style>

        <svg className="w-full h-full block" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="cardShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.10" />
            </filter>
            <filter id="tooltipShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.24" />
            </filter>
            <marker id="arrowHead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#4F46E5" />
            </marker>
          </defs>

          <g
            transform={`translate(${SVG_W / 2 + camera.x}, ${SVG_H / 2 + camera.y}) scale(${
              camera.scale
            }) translate(${-SVG_W / 2}, ${-SVG_H / 2})`}
          >
            {/* Layer 1: Background Orbital Rings or Tier Guidelines */}
            {layoutMode === 'constellation' ? (
              <g>
                <circle
                  cx={SVG_W / 2}
                  cy={SVG_H / 2 + 10}
                  r="128"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={SVG_W / 2}
                  cy={SVG_H / 2 + 10}
                  r="228"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </g>
            ) : (
              <g>
                {[
                  { y: 76, tag: 'TIER 0 · EXEC' },
                  { y: 215, tag: 'TIER 1 · LEADS' },
                  { y: 365, tag: 'TIER 2 · OPS / CLASSES' },
                  ...(isClassZoomed || adapter.id === 'hostel'
                    ? [{ y: 505, tag: 'TIER 3 · GROUND / STUDENTS' }]
                    : [])
                ].map((row) => (
                  <g key={row.y}>
                    <line
                      x1="44"
                      y1={row.y}
                      x2={SVG_W - 44}
                      y2={row.y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y={row.y + 3}
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#94A3B8"
                    >
                      {row.tag}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Layer 2: Reporting & Escalation Links */}
            <g>
              {nodes.map((node: SpatialNode) => {
                if (!node.parentId || !isNodeVisible(node)) return null;
                const p1 = positions[node.parentId];
                const p2 = positions[node.id];
                if (!p1 || !p2) return null;

                const isLineage = lineageSet.has(node.id) && lineageSet.has(node.parentId);
                const hue = getClusterHue(adapter, node.clusterId);

                let d = '';
                if (layoutMode === 'tree') {
                  const midY = (p1.y + p2.y) / 2;
                  d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${p1.x.toFixed(1)} ${midY.toFixed(
                    1
                  )}, ${p2.x.toFixed(1)} ${midY.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                } else {
                  const cx = SVG_W / 2;
                  const cy = SVG_H / 2 + 10;
                  const ctrlX = (p1.x + p2.x) * 0.46 + cx * 0.08;
                  const ctrlY = (p1.y + p2.y) * 0.46 + cy * 0.08;
                  d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(
                    1
                  )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                }

                return (
                  <path
                    key={`link-${node.id}`}
                    d={d}
                    fill="none"
                    stroke={isLineage ? hue.hex : '#CBD5E1'}
                    strokeWidth={isLineage ? 2.5 : 1.3}
                    strokeOpacity={isLineage ? 0.95 : 0.28}
                  />
                );
              })}
            </g>

            {/* Layer 2B: Dashed Delegation Arcs (e.g. Principal -> VP with expiry countdown) */}
            <g>
              {(adapter.delegations || []).map((del, idx) => {
                const p1 = positions[del.fromId];
                const p2 = positions[del.toId];
                if (!p1 || !p2) return null;

                const midX = (p1.x + p2.x) / 2 - 44;
                const midY = (p1.y + p2.y) / 2 - 36;
                const d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(
                  1
                )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

                return (
                  <g key={`del-${idx}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="2.2"
                      strokeDasharray="6 4"
                      markerEnd="url(#arrowHead)"
                      className="delegation-arc"
                    />
                    <g transform={`translate(${(midX - 68).toFixed(1)}, ${(midY - 14).toFixed(1)})`}>
                      <rect
                        width="148"
                        height="20"
                        rx="6"
                        fill="#EEF2FF"
                        stroke="#818CF8"
                        strokeWidth="1"
                      />
                      <text
                        x="74"
                        y="13"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        fill="#3730A3"
                      >
                        {del.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Layer 3: Persistent Entity Nodes (Focus + Context opacity: 0.22) */}
            <g>
              {nodes.map((node: SpatialNode) => {
                if (!isNodeVisible(node)) return null;
                const pos = positions[node.id];
                if (!pos) return null;

                const isSelected = node.id === selectedNodeId;
                const isInLineage = lineageSet.has(node.id);
                const hue = getClusterHue(adapter, node.clusterId);

                const isRoot = node.tier === 0;
                const isAggClass = Boolean(node.isAggregatedClass);
                const radius = isRoot ? 24 : isAggClass ? 21 : node.tier === 1 ? 19 : 16;

                const isSearchHit =
                  searchLower.length > 0 &&
                  (node.name.toLowerCase().includes(searchLower) ||
                    node.code.toLowerCase().includes(searchLower) ||
                    node.role.toLowerCase().includes(searchLower));

                // Focus + Context Lighting: Dim non-lineage nodes to 0.22 when a node is selected
                const nodeOpacity =
                  searchLower.length > 0
                    ? isSearchHit || isSelected
                      ? 1
                      : 0.22
                    : isInLineage
                    ? 1
                    : 0.22;

                const statusDotColor =
                  node.status === 'online'
                    ? '#10B981'
                    : node.status === 'alert'
                    ? '#E11D48'
                    : '#F59E0B';

                const displayLabel =
                  vpPrivacyMode && adapter.id === 'hostel' && node.tier >= 2
                    ? node.code
                    : isAggClass
                    ? node.code
                    : node.name.split(' ')[0];

                return (
                  <g
                    key={node.id}
                    className="spatial-node cursor-pointer"
                    opacity={nodeOpacity}
                    transform={`translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    {/* Search Pulse Ring (FLASH_MS = 1600) */}
                    {isSearchHit && (
                      <circle
                        r={radius + 7}
                        fill="none"
                        stroke={hue.hex}
                        strokeWidth="2.5"
                        className="pulse-flash-ring"
                      />
                    )}

                    {/* Selected Halo */}
                    {isSelected && (
                      <circle
                        r={radius + 6}
                        fill={hue.hex}
                        fillOpacity="0.15"
                        stroke={hue.hex}
                        strokeWidth="2"
                      />
                    )}

                    {/* Node Body (Rounded Square for Aggregated Class Clusters, Circle for People) */}
                    {isAggClass ? (
                      <rect
                        x={-radius}
                        y={-radius + 3}
                        width={radius * 2}
                        height={(radius - 3) * 2}
                        rx="10"
                        fill="#FFFFFF"
                        stroke={isSelected ? hue.hex : '#94A3B8'}
                        strokeWidth={isSelected ? 2.8 : 2}
                        filter="url(#cardShadow)"
                      />
                    ) : (
                      <circle
                        r={radius}
                        fill={isRoot ? '#0F172A' : '#FFFFFF'}
                        stroke={isSelected || isInLineage ? hue.hex : '#CBD5E1'}
                        strokeWidth={isSelected ? 3 : 2.2}
                        filter="url(#cardShadow)"
                      />
                    )}

                    {/* Tinted Inner Fill */}
                    {!isRoot && !isAggClass && (
                      <circle r={radius - 3.5} fill={hue.hex} fillOpacity="0.12" />
                    )}

                    {/* Initials / Cluster Code */}
                    <text
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={isRoot ? '11' : '9.5'}
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                      fill={isRoot ? '#FFFFFF' : hue.hex}
                    >
                      {node.initials}
                    </text>

                    {/* Live Presence Status Dot */}
                    <circle
                      cx={(radius * 0.72).toFixed(1)}
                      cy={(radius * 0.72).toFixed(1)}
                      r="4"
                      fill={statusDotColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />

                    {/* Node Caption */}
                    <text
                      y={radius + 13}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isSelected ? '700' : '500'}
                      fill={isSelected ? '#0F172A' : '#475569'}
                    >
                      {displayLabel}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Layer 4: Floating Dark Tooltip Badge on Selected Node */}
            {selectedNode && isNodeVisible(selectedNode) && positions[selectedNode.id] && (
              <g
                transform={`translate(${Math.max(
                  14,
                  Math.min(SVG_W - 196, positions[selectedNode.id].x - 91)
                ).toFixed(1)}, ${(positions[selectedNode.id].y < 105
                  ? positions[selectedNode.id].y + 32
                  : positions[selectedNode.id].y - 74
                ).toFixed(1)})`}
                filter="url(#tooltipShadow)"
                pointerEvents="none"
              >
                <rect width="182" height="46" rx="10" fill="#0F172A" />
                <circle
                  cx="14"
                  cy="16"
                  r="4"
                  fill={getClusterHue(adapter, selectedNode.clusterId).hex}
                />
                <text x="24" y="19" fontSize="11" fontWeight="700" fill="#FFFFFF">
                  {vpPrivacyMode && adapter.id === 'hostel' && selectedNode.tier >= 2
                    ? `Masked Unit (${selectedNode.code})`
                    : selectedNode.name.slice(0, 22)}
                </text>
                <text x="14" y="34" fontSize="9.5" fill="#94A3B8">
                  {selectedNode.role.slice(0, 29)}
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Bottom-Left Telemetry & Focus Legend */}
        <div className="hidden sm:flex absolute bottom-3 left-3 flex-wrap items-center gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> On-Duty / Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Leave / Pass
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" /> Alert / Exception
            </span>
          </div>
        </div>

        {/* Bottom-Right Zoom & Fit Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() =>
              setCamera((c) => ({ ...c, scale: Math.max(0.65, +(c.scale - 0.15).toFixed(2)) }))
            }
            className="px-2 py-1 rounded hover:bg-slate-100 text-xs font-bold text-slate-600"
          >
            −
          </button>
          <span className="px-1.5 text-[11px] font-mono text-slate-600 min-w-[42px] text-center">
            {Math.round(camera.scale * 100)}%
          </span>
          <button
            onClick={() =>
              setCamera((c) => ({ ...c, scale: Math.min(1.85, +(c.scale + 0.15).toFixed(2)) }))
            }
            className="px-2 py-1 rounded hover:bg-slate-100 text-xs font-bold text-slate-600"
          >
            +
          </button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            onClick={() => setCamera({ x: 0, y: 0, scale: 1 })}
            className="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
          >
            Fit
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Helper Components & Pure Functions
 */
function StatusBadge({ status }: { status: NodeStatus }) {
  if (status === 'online') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (status === 'alert') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
        Alert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Leave / Delegated
    </span>
  );
}

function getClusterHue(adapter: AreaAdapter, clusterId: string) {
  const cluster = adapter.clusters.find((c) => c.id === clusterId);
  return HUES[cluster?.hue ?? 'navy'] || HUES.navy;
}

function getLineageList(nodes: SpatialNode[], targetId: string): SpatialNode[] {
  const chain: SpatialNode[] = [];
  let curr = nodes.find((n) => n.id === targetId);
  const guard = new Set<string>();
  while (curr && !guard.has(curr.id)) {
    guard.add(curr.id);
    chain.unshift(curr);
    const pid = curr.parentId;
    curr = pid ? nodes.find((n) => n.id === pid) : undefined;
  }
  return chain;
}

export default SpatialPeopleMapWorkspace;
