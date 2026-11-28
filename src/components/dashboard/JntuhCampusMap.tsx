"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface CampusMapNode {
  id: string;
  name: string;
  scans?: number | null;
  share?: number;
  intensity?: "high" | "med" | "normal";
  fill?: string;
  statusText?: string;
}

export interface JntuhCampusMapProps {
  nodes?: CampusMapNode[];
  onSelectNode?: (nodeId: string) => void;
}

export function JntuhCampusMap({ nodes = [], onSelectNode }: JntuhCampusMapProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<{
    name: string;
    scans: string;
    share: string;
    x: number;
    y: number;
    intensity: "high" | "med" | "normal";
  } | null>(null);

  // Map nodes keyed by zone ID
  const nodeMap = new Map<string, CampusMapNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const getNodeInfo = (id: string, defaultName: string) => {
    const n = nodeMap.get(id);
    const scans = n?.scans ?? null;
    const share = n?.share ?? 0;
    const intensity = n?.intensity ?? "normal";
    const fill =
      n?.fill ??
      (intensity === "high" ? "#FF6B2C" : intensity === "med" ? "#3B82F6" : "#10B981");
    return {
      name: n?.name ?? defaultName,
      scans: scans !== null ? `${scans.toLocaleString()} scans` : "No scans logged",
      share: `${share}%`,
      intensity,
      fill,
    };
  };

  const handleMouseEnter = (
    e: React.MouseEvent,
    id: string,
    defaultName: string
  ) => {
    const info = getNodeInfo(id, defaultName);
    const rect = e.currentTarget.closest("#campusMapContainer")?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(rect.width - 170, Math.max(8, e.clientX - rect.left + 12));
    const y = Math.max(8, e.clientY - rect.top - 54);
    setHoveredNode({
      name: info.name,
      scans: info.scans,
      share: info.share,
      intensity: info.intensity,
      x,
      y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hoveredNode) return;
    const rect = e.currentTarget.closest("#campusMapContainer")?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(rect.width - 170, Math.max(8, e.clientX - rect.left + 12));
    const y = Math.max(8, e.clientY - rect.top - 54);
    setHoveredNode((prev) => (prev ? { ...prev, x, y } : null));
  };

  return (
    <div className="bento-card p-5 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6B2C] flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-[14px] font-bold text-slate-900 leading-tight">
              UCEJ Campus Spatial Map
            </h2>
            <p className="text-[10.5px] text-slate-500">JNTUH UCEJ Zones · Hover for activity</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.85, +(z + 0.2).toFixed(2)))}
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 transition-colors flex items-center gap-1"
          >
            <ZoomIn className="w-3 h-3" />
            <span>Zoom+</span>
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.85, +(z - 0.2).toFixed(2)))}
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 transition-colors flex items-center gap-1"
          >
            <ZoomOut className="w-3 h-3" />
            <span>Zoom-</span>
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive SVG Campus Schematic */}
      <div
        id="campusMapContainer"
        className="relative flex-1 min-h-[250px] bg-[#FAFBFD] border border-slate-100 rounded-2xl overflow-hidden select-none"
      >
        {/* Hover Tooltip */}
        {hoveredNode && (
          <div
            className="absolute z-20 pointer-events-none bg-white border border-slate-200 shadow-md rounded-xl px-3 py-2 text-[11.5px] min-w-[155px]"
            style={{ left: `${hoveredNode.x}px`, top: `${hoveredNode.y}px` }}
          >
            <div className="font-bold text-slate-900">{hoveredNode.name}</div>
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <span className="font-semibold text-slate-600 tabular-nums">
                {hoveredNode.scans}
              </span>
              <span
                className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                  hoveredNode.intensity === "high"
                    ? "bg-orange-50 text-[#FF6B2C]"
                    : hoveredNode.intensity === "med"
                    ? "bg-blue-50 text-[#3B82F6]"
                    : "bg-emerald-50 text-[#10B981]"
                }`}
              >
                {hoveredNode.share}
              </span>
            </div>
          </div>
        )}

        {/* Zoomable SVG Viewport */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <svg
            viewBox="0 0 560 320"
            className="w-full h-full p-2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="campusDots"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="0.8" fill="#E2E8F0" />
              </pattern>
            </defs>
            {/* Subtle Campus Ground Grid */}
            <rect width="560" height="320" fill="url(#campusDots)" rx="12" />

            {/* Stylized Campus Roads & Pathways */}
            <path
              d="M 15 268 L 545 268"
              stroke="#E2E8F0"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 278 268 L 278 32"
              stroke="#E2E8F0"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M 95 162 L 470 162"
              stroke="#E2E8F0"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M 15 268 L 545 268"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <path
              d="M 278 268 L 278 32"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />

            {/* Zone 1: Main Gate & Kiosk (Bottom Center) */}
            {(() => {
              const info = getNodeInfo("main_gate", "Main Gate & Kiosk");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("main_gate")}
                  onMouseEnter={(e) => handleMouseEnter(e, "main_gate", "Main Gate & Kiosk")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="210"
                    y="246"
                    width="136"
                    height="44"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="278"
                    y="266"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Main Gate &amp; Kiosk
                  </text>
                  <text
                    x="278"
                    y="280"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="#FFEDD5"
                  >
                    High Activity
                  </text>
                </g>
              );
            })()}

            {/* Zone 2: Academic Block A (IT/CSE) */}
            {(() => {
              const info = getNodeInfo("acad_a", "Academic Block A");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("acad_a")}
                  onMouseEnter={(e) => handleMouseEnter(e, "acad_a", "Academic Block A")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="34"
                    y="176"
                    width="154"
                    height="62"
                    rx="14"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="111"
                    y="203"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Academic Block A
                  </text>
                  <text
                    x="111"
                    y="218"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="#FFF7ED"
                  >
                    IT / CSE
                  </text>
                </g>
              );
            })()}

            {/* Zone 3: Academic Block B (ECE/EEE/ME) */}
            {(() => {
              const info = getNodeInfo("acad_b", "Academic Block B");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("acad_b")}
                  onMouseEnter={(e) => handleMouseEnter(e, "acad_b", "Academic Block B")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="370"
                    y="176"
                    width="156"
                    height="62"
                    rx="14"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="448"
                    y="203"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Academic Block B
                  </text>
                  <text
                    x="448"
                    y="218"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="#DBEAFE"
                  >
                    ECE / EEE / ME
                  </text>
                </g>
              );
            })()}

            {/* Zone 4: Boys Hostel 1 */}
            {(() => {
              const info = getNodeInfo("boys_1", "Boys Hostel 1");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("boys_1")}
                  onMouseEnter={(e) => handleMouseEnter(e, "boys_1", "Boys Hostel 1")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="28"
                    y="24"
                    width="112"
                    height="52"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="84"
                    y="47"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Boys Hostel 1
                  </text>
                  <text
                    x="84"
                    y="61"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#DBEAFE"
                  >
                    Block 1
                  </text>
                </g>
              );
            })()}

            {/* Zone 5: Boys Hostel 2 */}
            {(() => {
              const info = getNodeInfo("boys_2", "Boys Hostel 2");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("boys_2")}
                  onMouseEnter={(e) => handleMouseEnter(e, "boys_2", "Boys Hostel 2")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="150"
                    y="24"
                    width="108"
                    height="52"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="204"
                    y="47"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Boys Hostel 2
                  </text>
                  <text
                    x="204"
                    y="61"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#D1FAE5"
                  >
                    Block 2
                  </text>
                </g>
              );
            })()}

            {/* Zone 6: Girls Hostel 1 */}
            {(() => {
              const info = getNodeInfo("girls_1", "Girls Hostel 1");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("girls_1")}
                  onMouseEnter={(e) => handleMouseEnter(e, "girls_1", "Girls Hostel 1")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="302"
                    y="24"
                    width="108"
                    height="52"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="356"
                    y="47"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Girls Hostel 1
                  </text>
                  <text
                    x="356"
                    y="61"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#D1FAE5"
                  >
                    Block 3
                  </text>
                </g>
              );
            })()}

            {/* Zone 7: Girls Hostel 2 */}
            {(() => {
              const info = getNodeInfo("girls_2", "Girls Hostel 2");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("girls_2")}
                  onMouseEnter={(e) => handleMouseEnter(e, "girls_2", "Girls Hostel 2")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="420"
                    y="24"
                    width="112"
                    height="52"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="476"
                    y="47"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Girls Hostel 2
                  </text>
                  <text
                    x="476"
                    y="61"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#DBEAFE"
                  >
                    Block 4
                  </text>
                </g>
              );
            })()}

            {/* Zone 8: Central Mess */}
            {(() => {
              const info = getNodeInfo("mess", "Central Mess");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("mess")}
                  onMouseEnter={(e) => handleMouseEnter(e, "mess", "Central Mess")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="116"
                    y="96"
                    width="136"
                    height="48"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="184"
                    y="118"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Central Mess
                  </text>
                  <text
                    x="184"
                    y="131"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#FFF7ED"
                  >
                    Dining Peak
                  </text>
                </g>
              );
            })()}

            {/* Zone 9: Exam Halls */}
            {(() => {
              const info = getNodeInfo("exam_halls", "Exam Halls");
              return (
                <g
                  className="campus-zone cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectNode?.("exam_halls")}
                  onMouseEnter={(e) => handleMouseEnter(e, "exam_halls", "Exam Halls")}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x="308"
                    y="96"
                    width="136"
                    height="48"
                    rx="12"
                    fill={info.fill}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x="376"
                    y="118"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    Exam Halls
                  </text>
                  <text
                    x="376"
                    y="131"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#DCFCE7"
                  >
                    Normal Load
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Intensity Legend */}
        <div className="absolute bottom-2 left-2.5 flex items-center gap-2.5 bg-white/92 backdrop-blur-xs border border-slate-200/80 rounded-full px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-2xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF6B2C]" />
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            Med-High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Normal
          </span>
        </div>
      </div>
    </div>
  );
}
