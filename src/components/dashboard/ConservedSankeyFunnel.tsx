"use client";

import React, { useState } from "react";
import { Workflow } from "lucide-react";

export interface SankeyStepDef {
  active: { id: string; label: string; count: number };
  dropoff?: { id: string; label: string; count: number };
}

export interface ConservedFunnelData {
  unit: string;
  totalStart: number;
  completionRate: string | number;
  steps: SankeyStepDef[];
}

export interface FunnelsMap {
  gate_pass: ConservedFunnelData;
  circular: ConservedFunnelData;
  agent: ConservedFunnelData;
  [key: string]: ConservedFunnelData | undefined;
}

export interface ConservedSankeyFunnelProps {
  funnels?: FunnelsMap;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const DEFAULT_FUNNELS: FunnelsMap = {
  gate_pass: {
    unit: "passes",
    totalStart: 1480,
    completionRate: 61.4,
    steps: [
      { active: { id: "a1", label: "Pass Drafted", count: 1480 } },
      {
        active: { id: "a2", label: "Parent Consent", count: 1240 },
        dropoff: { id: "d2", label: "Expired / Cancelled", count: 240 },
      },
      {
        active: { id: "a3", label: "Warden/HOD Approval", count: 1042 },
        dropoff: { id: "d3", label: "Parent Denied", count: 198 },
      },
      {
        active: { id: "a4", label: "Gate Scan Out", count: 908 },
        dropoff: { id: "d4", label: "Quota Blocked", count: 134 },
      },
    ],
  },
  circular: {
    unit: "recipients",
    totalStart: 4200,
    completionRate: 72.8,
    steps: [
      { active: { id: "a1", label: "Circular Published", count: 4200 } },
      {
        active: { id: "a2", label: "Viewed in Feed/Chat", count: 3710 },
        dropoff: { id: "d2", label: "Unopened", count: 490 },
      },
      {
        active: { id: "a3", label: "Clicked Mark Noted", count: 3340 },
        dropoff: { id: "d3", label: "Viewed Unnoted", count: 370 },
      },
      {
        active: { id: "a4", label: "Deadline Met", count: 3058 },
        dropoff: { id: "d4", label: "Missed Deadline", count: 282 },
      },
    ],
  },
  agent: {
    unit: "threads",
    totalStart: 980,
    completionRate: 59.2,
    steps: [
      { active: { id: "a1", label: "Opened @agent Drawer", count: 980 } },
      {
        active: { id: "a2", label: "Confirmed KB Hit", count: 790 },
        dropoff: { id: "d2", label: "Dismissed Early", count: 190 },
      },
      {
        active: { id: "a3", label: "Draft Action Card", count: 660 },
        dropoff: { id: "d3", label: "Escalated to Authority", count: 130 },
      },
      {
        active: { id: "a4", label: "Confirmed & Sent", count: 580 },
        dropoff: { id: "d4", label: "Abandoned Draft", count: 80 },
      },
    ],
  },
};

export function ConservedSankeyFunnel({
  funnels = DEFAULT_FUNNELS,
  activeTab: controlledTab,
  onTabChange,
}: ConservedSankeyFunnelProps) {
  const [internalTab, setInternalTab] = useState<string>("gate_pass");
  const activeFunnelKey = controlledTab ?? internalTab;

  const [hoveredItem, setHoveredItem] = useState<{
    id: string;
    title: string;
    sub: string;
    count: string;
    pct: string;
    type: "active" | "dropoff";
    x: number;
    y: number;
    connectedNodeIds: string[];
    connectedLinkIds: string[];
  } | null>(null);

  const funnel = funnels[activeFunnelKey] ?? funnels.gate_pass ?? DEFAULT_FUNNELS.gate_pass;
  const total = Math.max(funnel.totalStart, 1);

  const setTab = (key: string) => {
    setInternalTab(key);
    onTabChange?.(key);
  };

  const colX = [26, 304, 588, 868];
  const nodeW = 64;
  const maxBarH = 160;
  const activeTopY = 48;
  const dropBaseY = 236;

  // Build node geometry
  interface NodeGeo {
    id: string;
    col: number;
    label: string;
    count: number;
    pctOfStart: string;
    type: "active" | "dropoff";
    x: number;
    y: number;
    h: number;
  }

  const nodes: NodeGeo[] = [];
  const nodeById = new Map<string, NodeGeo>();

  funnel.steps.forEach((step, idx) => {
    const a = step.active;
    const aH = Math.max(24, Math.round((a.count / total) * maxBarH));
    const aNode: NodeGeo = {
      id: a.id,
      col: idx,
      label: a.label,
      count: a.count,
      pctOfStart: ((a.count / total) * 100).toFixed(1),
      type: "active",
      x: colX[idx],
      y: activeTopY,
      h: aH,
    };
    nodes.push(aNode);
    nodeById.set(aNode.id, aNode);

    if (step.dropoff) {
      const d = step.dropoff;
      const dH = Math.max(18, Math.round((d.count / total) * maxBarH));
      const dNode: NodeGeo = {
        id: d.id,
        col: idx,
        label: d.label,
        count: d.count,
        pctOfStart: ((d.count / total) * 100).toFixed(1),
        type: "dropoff",
        x: colX[idx],
        y: dropBaseY,
        h: Math.min(62, dH),
      };
      nodes.push(dNode);
      nodeById.set(dNode.id, dNode);
    }
  });

  // Build links with strict flow conservation
  interface LinkGeo {
    id: string;
    source: string;
    target: string;
    title: string;
    sub: string;
    count: number;
    stepPct: string;
    type: "active" | "dropoff";
    d: string;
  }

  const links: LinkGeo[] = [];
  for (let i = 0; i < 3; i++) {
    const src = nodeById.get(`a${i + 1}`);
    const nextActive = nodeById.get(`a${i + 2}`);
    const nextDrop = nodeById.get(`d${i + 2}`);

    if (src && nextActive) {
      const activeShareOfSrc = src.count > 0 ? nextActive.count / src.count : 0;
      const activeRibbonH = Math.max(8, src.h * activeShareOfSrc);
      const x0 = src.x + nodeW;
      const y0Top = src.y;
      const y0Bot = src.y + activeRibbonH;
      const x1 = nextActive.x;
      const y1Top = nextActive.y;
      const y1Bot = nextActive.y + nextActive.h;
      const cx = (x0 + x1) / 2;

      const dActive = `M ${x0} ${y0Top} C ${cx} ${y0Top}, ${cx} ${y1Top}, ${x1} ${y1Top} L ${x1} ${y1Bot} C ${cx} ${y1Bot}, ${cx} ${y0Bot}, ${x0} ${y0Bot} Z`;

      links.push({
        id: `link_${src.id}_${nextActive.id}`,
        source: src.id,
        target: nextActive.id,
        title: `${src.label} → ${nextActive.label}`,
        sub: `Step ${i + 1} to Step ${i + 2} Conversion`,
        count: nextActive.count,
        stepPct: (activeShareOfSrc * 100).toFixed(1),
        type: "active",
        d: dActive,
      });

      if (nextDrop) {
        const dropShareOfSrc = src.count > 0 ? nextDrop.count / src.count : 0;
        const dy0Top = src.y + activeRibbonH;
        const dy0Bot = src.y + src.h;
        const dy1Top = nextDrop.y;
        const dy1Bot = nextDrop.y + nextDrop.h;
        const dDrop = `M ${x0} ${dy0Top} C ${cx} ${dy0Top}, ${cx} ${dy1Top}, ${x1} ${dy1Top} L ${x1} ${dy1Bot} C ${cx} ${dy1Bot}, ${cx} ${dy0Bot}, ${x0} ${dy0Bot} Z`;

        links.push({
          id: `link_${src.id}_${nextDrop.id}`,
          source: src.id,
          target: nextDrop.id,
          title: `${src.label} → ${nextDrop.label}`,
          sub: `Step ${i + 1} to Step ${i + 2} Drop-Off`,
          count: nextDrop.count,
          stepPct: (dropShareOfSrc * 100).toFixed(1),
          type: "dropoff",
          d: dDrop,
        });
      }
    }
  }

  const handleNodeEnter = (e: React.MouseEvent, n: NodeGeo) => {
    const connectedLinks = links.filter((l) => l.source === n.id || l.target === n.id);
    const connectedNodes = [
      n.id,
      ...connectedLinks.map((l) => (l.source === n.id ? l.target : l.source)),
    ];
    setHoveredItem({
      id: n.id,
      title: n.label,
      sub: `Step ${n.col + 1} · ${n.pctOfStart}% of initial volume`,
      count: `${n.count.toLocaleString()} ${funnel.unit}`,
      pct: `${n.pctOfStart}%`,
      type: n.type,
      x: e.clientX,
      y: e.clientY,
      connectedNodeIds: connectedNodes,
      connectedLinkIds: connectedLinks.map((l) => l.id),
    });
  };

  const handleLinkEnter = (e: React.MouseEvent, l: LinkGeo) => {
    setHoveredItem({
      id: l.id,
      title: l.title,
      sub: l.sub,
      count: `${l.count.toLocaleString()} ${funnel.unit}`,
      pct: `${l.stepPct}%`,
      type: l.type,
      x: e.clientX,
      y: e.clientY,
      connectedNodeIds: [l.source, l.target],
      connectedLinkIds: [l.id],
    });
  };

  return (
    <section className="bento-card p-5 relative bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-orange-50 text-[#FF6B2C] flex items-center justify-center shrink-0">
            <Workflow className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-[14.5px] font-bold text-slate-900 leading-tight">
              Operational Journey &amp; Drop-Off Map
            </h2>
            <p className="text-[11.5px] text-slate-500">
              Strict flow conservation · Hover any node or ribbon to inspect step conversion
            </p>
          </div>
        </div>

        {/* 3-Tab Funnel Switcher */}
        <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-slate-200/70 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setTab("gate_pass")}
            className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all ${
              activeFunnelKey === "gate_pass"
                ? "font-semibold bg-white text-[#FF6B2C] shadow-xs"
                : "font-medium text-slate-600 hover:text-slate-900"
            }`}
          >
            Gate Pass Funnel
          </button>
          <button
            type="button"
            onClick={() => setTab("circular")}
            className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all ${
              activeFunnelKey === "circular"
                ? "font-semibold bg-white text-[#FF6B2C] shadow-xs"
                : "font-medium text-slate-600 hover:text-slate-900"
            }`}
          >
            Circular &apos;Noted&apos; Funnel
          </button>
          <button
            type="button"
            onClick={() => setTab("agent")}
            className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all ${
              activeFunnelKey === "agent"
                ? "font-semibold bg-white text-[#FF6B2C] shadow-xs"
                : "font-medium text-slate-600 hover:text-slate-900"
            }`}
          >
            Agent &amp; Doubt Funnel
          </button>
        </div>
      </div>

      {/* Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-100 text-[11.5px] font-medium text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #FF551A 0%, #FF844B 100%)" }}
            />
            Completed / Active Path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
            Drop-Off / Blocked
          </span>
        </div>
        <div className="text-[12px] font-bold text-slate-800 tabular-nums">
          End-to-End Completion:{" "}
          <span className="text-[#FF6B2C]">{funnel.completionRate}%</span>{" "}
          <span className="text-slate-400 font-medium">
            ({funnel.steps[3]?.active.count?.toLocaleString() ?? 0} /{" "}
            {total.toLocaleString()} {funnel.unit})
          </span>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-slate-200 shadow-md rounded-2xl px-3.5 py-2.5 min-w-[205px]"
          style={{
            left: `${Math.min(
              typeof window !== "undefined" ? window.innerWidth - 230 : 600,
              hoveredItem.x + 14
            )}px`,
            top: `${Math.max(12, hoveredItem.y - 78)}px`,
          }}
        >
          <div className="text-[12px] font-bold text-slate-900">{hoveredItem.title}</div>
          <div className="text-[10.5px] font-medium text-slate-500 mt-0.5">
            {hoveredItem.sub}
          </div>
          <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-slate-100">
            <span
              className={`text-[13px] font-extrabold tabular-nums ${
                hoveredItem.type === "dropoff" ? "text-slate-600" : "text-[#FF6B2C]"
              }`}
            >
              {hoveredItem.count}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                hoveredItem.type === "dropoff"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-orange-50 text-[#FF6B2C]"
              }`}
            >
              {hoveredItem.pct}
            </span>
          </div>
        </div>
      )}

      {/* Horizontal Scroll Wrapper */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="min-w-[880px]">
          {/* 4 Step Column Labels */}
          <div className="grid grid-cols-4 px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <div>
              Step 1 <span className="font-medium normal-case text-slate-400 ml-1">Initiation</span>
            </div>
            <div className="pl-5">
              Step 2{" "}
              <span className="font-medium normal-case text-slate-400 ml-1">Verification</span>
            </div>
            <div className="pl-8">
              Step 3{" "}
              <span className="font-medium normal-case text-slate-400 ml-1">
                Approval / Action
              </span>
            </div>
            <div className="pl-12">
              Step 4{" "}
              <span className="font-medium normal-case text-slate-400 ml-1">Completion</span>
            </div>
          </div>

          {/* SVG Canvas */}
          <svg
            viewBox="0 0 1000 320"
            className="w-full h-auto block select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="skOrangeNode" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF551A" />
                <stop offset="100%" stopColor="#FF844B" />
              </linearGradient>
              <linearGradient id="skGrayNode" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>
              <linearGradient id="skOrangeRibbon" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF6B2C" stopOpacity="0.34" />
                <stop offset="50%" stopColor="#FF844B" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#FF551A" stopOpacity="0.36" />
              </linearGradient>
              <linearGradient id="skGrayRibbon" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.26" />
                <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.32" />
              </linearGradient>
            </defs>

            {/* Links Layer */}
            <g>
              {links.map((l) => {
                const isHovered = hoveredItem?.connectedLinkIds.includes(l.id);
                const isAnyHovered = !!hoveredItem;
                const opacity = isAnyHovered ? (isHovered ? 1 : 0.14) : 1;
                return (
                  <path
                    key={l.id}
                    d={l.d}
                    fill={l.type === "active" ? "url(#skOrangeRibbon)" : "url(#skGrayRibbon)"}
                    opacity={opacity}
                    className="cursor-pointer transition-opacity duration-200"
                    onMouseEnter={(e) => handleLinkEnter(e, l)}
                    onMouseMove={(e) =>
                      setHoveredItem((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                      )
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                  />
                );
              })}
            </g>

            {/* Nodes Layer */}
            <g>
              {nodes.map((n) => {
                const fill = n.type === "active" ? "url(#skOrangeNode)" : "url(#skGrayNode)";
                const rx = Math.min(12, n.h / 2);
                const labelY = n.type === "active" ? n.y - 20 : n.y - 18;
                const metaY = n.type === "active" ? n.y - 6 : n.y - 5;
                const textAnchor = n.col === 3 ? "end" : "start";
                const textX = n.col === 3 ? n.x + nodeW : n.x;

                const isHovered = hoveredItem?.connectedNodeIds.includes(n.id);
                const isAnyHovered = !!hoveredItem;
                const opacity = isAnyHovered ? (isHovered ? 1 : 0.25) : 1;

                return (
                  <g
                    key={n.id}
                    className="cursor-pointer transition-opacity duration-200"
                    opacity={opacity}
                    onMouseEnter={(e) => handleNodeEnter(e, n)}
                    onMouseMove={(e) =>
                      setHoveredItem((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                      )
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <text
                      x={textX}
                      y={labelY}
                      textAnchor={textAnchor}
                      fontSize="11.5"
                      fontWeight="700"
                      fill={n.type === "active" ? "#0F172A" : "#475569"}
                    >
                      {n.label}
                    </text>
                    <text
                      x={textX}
                      y={metaY}
                      textAnchor={textAnchor}
                      fontSize="10"
                      fontWeight="600"
                      fill="#64748B"
                    >
                      {n.count.toLocaleString()} · {n.pctOfStart}%
                    </text>
                    <rect
                      x={n.x}
                      y={n.y}
                      width={nodeW}
                      height={n.h}
                      rx={rx}
                      ry={rx}
                      fill={fill}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
