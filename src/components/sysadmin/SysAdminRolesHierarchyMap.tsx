"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils";

/**
 * ============================================================================
 * /sysadmin/roles — Sequential 6-Hierarchy Role Map
 * - Renders each of the 6 JNTUH CEJ hierarchies one by one (tabs + prev/next)
 * - Dual-mode SVG canvas: Sequential Tree <-> Polar Constellation (60fps smoothstep)
 * - Hydrates live user_count & on_campus from GET /api/roles-graph
 * - WCAG AA contrast compliant (slate-600+ text, 0.48 dimmed context opacity)
 * - SysAdmin-only: displays internal role keys, scope rules & two-person guards
 * ============================================================================
 */

const MORPH_MS = 720;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type RoleSurfaceType = "Dedicated Console" | "DB-Only" | "Role Context" | "Legacy";

interface RoleNodeDef {
  code: string;
  label: string;
  short: string;
  parent: string | null;
  tier: number;
  scope: string;
  surface: RoleSurfaceType;
  twoPerson?: string;
  route?: string;
  summary: string;
}

interface HierarchyDef {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  accent: string;
  accentBg: string;
  accentText: string;
  nodes: RoleNodeDef[];
}

interface RolesGraphApiPayload {
  user_counts?: Record<string, number>;
  on_campus_counts?: Record<string, number>;
  totals?: { roles: number; users: number; onCampus: number };
}

const HIERARCHIES: HierarchyDef[] = [
  {
    id: "academic",
    index: 1,
    title: "1. Executive & Academic",
    subtitle: "Principal → Dean / VP → HOD → Faculty → Student → Parent / Guardian",
    accent: "#4338CA", // indigo-700 (high contrast)
    accentBg: "#EEF2FF",
    accentText: "#312E81",
    nodes: [
      { code: "principal", label: "Principal", short: "PR", parent: null, tier: 0, scope: "Global", surface: "Dedicated Console", twoPerson: "DEBARRED / Lockdown / Break-Glass", route: "/principal/home", summary: "Administrative & academic head; top of all escalation chains." },
      { code: "dean", label: "Dean", short: "DN", parent: "principal", tier: 1, scope: "Global (Academic)", surface: "DB-Only", twoPerson: "DEBARRED (2nd Approver)", route: "/sysadmin/academic-status", summary: "Associate Dean; cross-department compliance & two-person DEBARRED sign-off." },
      { code: "vice_principal", label: "Vice Principal", short: "VP", parent: "principal", tier: 1, scope: "Global (Delegated)", surface: "Dedicated Console", route: "/vice-principal/home", summary: "Deputy executive; Principal Bridge, time-boxed delegations & department review." },
      { code: "hod", label: "HOD", short: "HD", parent: "vice_principal", tier: 2, scope: "departmentId", surface: "Dedicated Console", twoPerson: "DEBARRED (Initiator)", route: "/hod/home", summary: "Department head (EEE, ME, ECE, CSE, IT); timetable, faculty load & status flags." },
      { code: "faculty", label: "Faculty", short: "FC", parent: "hod", tier: 3, scope: "faculty_assignments", surface: "Dedicated Console", route: "/faculty", summary: "Lecture attendance, internal marks entry, mentoring & class requests." },
      { code: "student", label: "Student", short: "ST", parent: "faculty", tier: 4, scope: "Self (Persona)", surface: "Dedicated Console", route: "/student", summary: "Day scholar / hosteller persona; gate passes, attendance, mess & complaints." },
      { code: "parent", label: "Parent", short: "PA", parent: "student", tier: 5, scope: "parents_students", surface: "Dedicated Console", route: "/guardian", summary: "Ward attendance, fee alerts & mandatory hostel gate-pass consent." },
      { code: "guardian", label: "Guardian", short: "GU", parent: "student", tier: 5, scope: "parents_students", surface: "Dedicated Console", route: "/guardian", summary: "Local guardian; curfew compliance, visit scheduling & pass consent." },
    ],
  },
  {
    id: "hostel",
    index: 2,
    title: "2. Hostel & Mess Ops",
    subtitle: "Chief Warden (Principal context) → Hostel Manager → Deputy Warden / Mess → Caretaker → Worker",
    accent: "#047857", // emerald-700
    accentBg: "#ECFDF5",
    accentText: "#064E3B",
    nodes: [
      { code: "chief_warden", label: "Chief Warden", short: "CW", parent: null, tier: 0, scope: "All 4 Blocks", surface: "Role Context", twoPerson: "DEBARRED (Hostel Escalation)", route: "/principal/operations/hostel", summary: "Role context on Principal (role_context='chief_warden'); highest hostel authority." },
      { code: "hostel_manager", label: "Hostel Manager", short: "HM", parent: "chief_warden", tier: 1, scope: "All 4 Blocks", surface: "Dedicated Console", route: "/hostel-manager/home", summary: "Room allotments, block occupancy, escalated grievances & mess oversight." },
      { code: "deputy_warden", label: "Deputy Warden", short: "DW", parent: "hostel_manager", tier: 2, scope: "hostel_scope", surface: "Dedicated Console", route: "/deputy-warden/home", summary: "Block-level curfew oversight, night attendance reconciliation & leave approvals." },
      { code: "mess_incharge", label: "Mess In-Charge", short: "MI", parent: "hostel_manager", tier: 2, scope: "Central Mess", surface: "Dedicated Console", route: "/mess", summary: "Menu scheduling, QR meal token scanning, inventory & consumption reconciliation." },
      { code: "caretaker", label: "Caretaker", short: "CT", parent: "deputy_warden", tier: 3, scope: "hostel_scope", surface: "Dedicated Console", route: "/caretaker/home", summary: "Block maintenance tickets, housekeeping inspections & worker dispatch." },
      { code: "worker", label: "Worker", short: "WK", parent: "caretaker", tier: 4, scope: "Assigned Tickets", surface: "Dedicated Console", route: "/worker/work-orders", summary: "Executes block maintenance work orders & shift tasks." },
    ],
  },
  {
    id: "exam",
    index: 3,
    title: "3. Examination Branch",
    subtitle: "Controller & Split Addl. Controllers (SoD) + Exam Superintendent / VP → OIE & Exam Branch",
    accent: "#B45309", // amber-700
    accentBg: "#FFFBEB",
    accentText: "#78350F",
    nodes: [
      { code: "controller_examinations", label: "Controller of Exams", short: "CE", parent: null, tier: 0, scope: "Global (Exams)", surface: "DB-Only", twoPerson: "Result Sign-Off (SoD)", route: "/exam-branch/home", summary: "Overall exam conduct & final result sign-off." },
      { code: "addl_controller_academic", label: "Addl. Ctrl (Academic)", short: "AA", parent: "controller_examinations", tier: 1, scope: "Exam Academic", surface: "DB-Only", route: "/exam-branch/discrepancies", summary: "Admission verification, malpractice review & late mark correction auth." },
      { code: "addl_controller_results", label: "Addl. Ctrl (Results)", short: "AR", parent: "controller_examinations", tier: 1, scope: "Result Processing", surface: "DB-Only", route: "/exam-branch/records", summary: "Barcoded mark sheet scanning & compilation (cannot alter raw marks)." },
      { code: "addl_controller_automation", label: "Addl. Ctrl (Automation)", short: "AU", parent: "controller_examinations", tier: 1, scope: "CBT & Hall Tickets", surface: "DB-Only", route: "/exam-branch/calendar", summary: "Rosters, CBT administration, hall tickets & question paper encryption." },
      { code: "exam_superintendent", label: "Exam Superintendent", short: "ES", parent: "controller_examinations", tier: 1, scope: "Exam Day", surface: "Role Context", route: "/exam/superintendent/home", summary: "Chief Superintendent context on Principal; live hall access & spot exceptions." },
      { code: "oie", label: "OIE", short: "OI", parent: "exam_superintendent", tier: 2, scope: "Exam Triage", surface: "Dedicated Console", route: "/oie", summary: "Exam office queue triage, candidate attendance reconciliation & exceptions." },
      { code: "exam_branch", label: "Exam Branch", short: "EB", parent: "exam_superintendent", tier: 2, scope: "Exam Cell", surface: "Dedicated Console", route: "/exam-branch/home", summary: "Hall ticket generation, discrepancy radar & OIE handoff." },
    ],
  },
  {
    id: "security",
    index: 4,
    title: "4. Gate & Perimeter Security",
    subtitle: "Principal → Admin → Security Supervisor → Gate Operator / Worker / Visitor",
    accent: "#1E293B", // slate-800
    accentBg: "#F1F5F9",
    accentText: "#0F172A",
    nodes: [
      { code: "principal", label: "Principal", short: "PR", parent: null, tier: 0, scope: "Global", surface: "Dedicated Console", twoPerson: "Lockdown (2nd Approver)", route: "/principal/operations/gates", summary: "Final authority for campus-wide emergency lockdown." },
      { code: "admin", label: "Admin", short: "AD", parent: "principal", tier: 1, scope: "Global (Ops)", surface: "Dedicated Console", twoPerson: "Lockdown (Initiator)", route: "/admin/gates", summary: "Gate hardware config, visitor policy & emergency lockdown trigger." },
      { code: "supervisor", label: "Security Supervisor", short: "SV", parent: "admin", tier: 2, scope: "All Gates", surface: "Dedicated Console", route: "/supervisor/home", summary: "Control Room; multi-gate live wall, watchlist, overstay alerts & claim codes." },
      { code: "operator", label: "Gate Operator", short: "OP", parent: "supervisor", tier: 3, scope: "gateId", surface: "Dedicated Console", route: "/operator", summary: "Physical gate kiosk; QR/RFID scan, manual entry & pass verification." },
      { code: "worker", label: "Worker (Gate Duty)", short: "WK", parent: "supervisor", tier: 3, scope: "Claimed Gate", surface: "Dedicated Console", route: "/worker/shifts", summary: "Assists gate scanning when rostered via supervisor claim code." },
      { code: "visitor", label: "Visitor", short: "VS", parent: "operator", tier: 4, scope: "Self (Sandboxed)", surface: "Dedicated Console", route: "/visitor", summary: "Self-service guest pass registration, check-in/out & overstay tracking." },
    ],
  },
  {
    id: "estate",
    index: 5,
    title: "5. Estate & Non-Teaching Staff",
    subtitle: "Principal → EMO & Admin → Staff & Maintenance Workers",
    accent: "#6D28D9", // violet-700
    accentBg: "#F5F3FF",
    accentText: "#4C1D95",
    nodes: [
      { code: "principal", label: "Principal", short: "PR", parent: null, tier: 0, scope: "Global", surface: "Dedicated Console", route: "/principal/home", summary: "Approves major infrastructure repair budgets & vendor contracts." },
      { code: "emo", label: "EMO", short: "EM", parent: "principal", tier: 1, scope: "Campus Estate", surface: "Dedicated Console", route: "/emo", summary: "Estate Maintenance Officer; civil/electrical/plumbing triage & repair cosign." },
      { code: "admin", label: "Admin", short: "AD", parent: "principal", tier: 1, scope: "Global (Ops)", surface: "Dedicated Console", route: "/admin/staff", summary: "Operational coordination, staff shifts & non-infrastructure tickets." },
      { code: "staff", label: "Staff", short: "SF", parent: "admin", tier: 2, scope: "Self", surface: "Dedicated Console", route: "/staff", summary: "Non-teaching institutional staff; duties, shifts, handovers & requests." },
      { code: "worker", label: "Worker", short: "WK", parent: "emo", tier: 2, scope: "Assigned Orders", surface: "Dedicated Console", route: "/worker/work-orders", summary: "Field maintenance work orders & shift attendance." },
    ],
  },
  {
    id: "platform",
    index: 6,
    title: "6. Platform & Server Governance",
    subtitle: "SysAdmin (Exclusive UUIDs & Infra) · Admin (Operational) · Legacy Compatibility",
    accent: "#BE123C", // rose-700
    accentBg: "#FFF1F2",
    accentText: "#881337",
    nodes: [
      { code: "sysadmin", label: "SysAdmin", short: "SA", parent: null, tier: 0, scope: "Server / Infra", surface: "Dedicated Console", twoPerson: "Break-Glass / DR Drills", route: "/sysadmin/infrastructure", summary: "MFA-gated; Docker, DB health, RLS drift & exclusive internal UUID visibility." },
      { code: "admin", label: "Admin", short: "AD", parent: "sysadmin", tier: 1, scope: "Campus Ops", surface: "Dedicated Console", twoPerson: "Lockdown (with Principal)", route: "/admin/overview", summary: "MFA-gated; users, passes, SMS, mess & audit exports (UUIDs redacted)." },
      { code: "hostel", label: "hostel (Legacy)", short: "LG", parent: "admin", tier: 2, scope: "Compat Only", surface: "Legacy", summary: "Legacy folded approver key kept for permissions compatibility; do not assign." },
    ],
  },
];

interface LiveCandidate {
  id: string;
  name: string;
  unique_id?: string;
  role: string;
  status?: string;
  department_id?: string | null;
  assigned_hostel?: string | null;
}

export function SysAdminRolesHierarchyMap() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [layoutMode, setLayoutMode] = useState<"tree" | "constellation">("tree");
  const [selectedCode, setSelectedCode] = useState<string>(HIERARCHIES[0].nodes[0].code);
  const [counts, setCounts] = useState<RolesGraphApiPayload>({});
  const [candidatesByRole, setCandidatesByRole] = useState<Record<string, LiveCandidate[]>>({});
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const hierarchy = HIERARCHIES[activeIdx];
  const SVG_W = 860;
  const SVG_H = 480;

  // Hydrate live counts from /api/roles-graph
  useEffect(() => {
    let alive = true;
    fetch("/api/roles-graph", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json) setCounts(json.data ?? json);
      })
      .catch(() => {
        /* non-fatal: renders structural hierarchy with 0 counts */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Reset selected node when switching hierarchy
  const selectHierarchy = (idx: number) => {
    setActiveIdx(idx);
    setSelectedCode(HIERARCHIES[idx].nodes[0].code);
  };

  // Progressive reveal: fetch real backend users for the clicked role
  useEffect(() => {
    if (!selectedCode || candidatesByRole[selectedCode]) return;
    let alive = true;
    setLoadingRole(selectedCode);
    fetch(`/api/users?role=${encodeURIComponent(selectedCode)}&limit=8`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        const rows = (json?.data?.users ?? json?.users ?? json?.data ?? []) as LiveCandidate[];
        setCandidatesByRole((prev) => ({
          ...prev,
          [selectedCode]: Array.isArray(rows) ? rows : [],
        }));
      })
      .catch(() => {
        if (alive) {
          setCandidatesByRole((prev) => ({ ...prev, [selectedCode]: [] }));
        }
      })
      .finally(() => {
        if (alive) setLoadingRole(null);
      });
    return () => {
      alive = false;
    };
  }, [selectedCode, candidatesByRole]);

  // Compute target coordinates for Sequential Tree or Polar Constellation
  const targetPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    const nodes = hierarchy.nodes;
    const maxTier = Math.max(...nodes.map((n) => n.tier), 1);

    if (layoutMode === "tree") {
      const topPad = 56;
      const bottomPad = 56;
      const usableH = SVG_H - topPad - bottomPad;

      for (let t = 0; t <= maxTier; t++) {
        const row = nodes.filter((n) => n.tier === t);
        if (!row.length) continue;
        const y = topPad + (maxTier === 0 ? 0 : (t / maxTier) * usableH);
        const padX = row.length === 1 ? SVG_W / 2 : 110;
        const usableW = SVG_W - padX * 2;
        row.forEach((n, i) => {
          const x = row.length === 1 ? SVG_W / 2 : padX + (i / (row.length - 1)) * usableW;
          map[n.code] = { x, y };
        });
      }
    } else {
      const cx = SVG_W / 2;
      const cy = SVG_H / 2;
      nodes.forEach((n, idx) => {
        if (n.tier === 0) {
          map[n.code] = { x: cx, y: cy };
        } else {
          const peers = nodes.filter((p) => p.tier === n.tier);
          const peerIdx = peers.findIndex((p) => p.code === n.code);
          const radius = Math.min(200, 88 + (n.tier - 1) * 52);
          const angle = -Math.PI / 2 + (peerIdx / Math.max(peers.length, 1)) * Math.PI * 2 + idx * 0.15;
          map[n.code] = {
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
          };
        }
      });
    }
    return map;
  }, [hierarchy, layoutMode]);

  // 60fps smoothstep interpolation between layouts & hierarchies
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(targetPositions);
  const posRef = useRef<Record<string, { x: number; y: number }>>(targetPositions);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start: Record<string, { x: number; y: number }> = {};
    hierarchy.nodes.forEach((n) => {
      start[n.code] = posRef.current[n.code] ?? { x: SVG_W / 2, y: SVG_H / 2 };
    });
    const t0 = performance.now();

    const tick = (now: number) => {
      const k = smoothstep(0, MORPH_MS, now - t0);
      const next: Record<string, { x: number; y: number }> = {};
      hierarchy.nodes.forEach((n) => {
        const s = start[n.code];
        const e = targetPositions[n.code] ?? s;
        next[n.code] = { x: s.x + (e.x - s.x) * k, y: s.y + (e.y - s.y) * k };
      });
      posRef.current = next;
      setPositions(next);
      if (now - t0 < MORPH_MS) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetPositions, hierarchy]);

  // Lineage set for focus + readable context (0.48 dimmed opacity)
  const lineage = useMemo(() => {
    const set = new Set<string>([selectedCode]);
    let curr = hierarchy.nodes.find((n) => n.code === selectedCode);
    while (curr?.parent) {
      set.add(curr.parent);
      curr = hierarchy.nodes.find((n) => n.code === curr?.parent);
    }
    hierarchy.nodes.forEach((n) => {
      if (n.parent === selectedCode) set.add(n.code);
    });
    return set;
  }, [hierarchy, selectedCode]);

  const selectedNode =
    hierarchy.nodes.find((n) => n.code === selectedCode) ?? hierarchy.nodes[0];

  const userCount = (code: string) => counts.user_counts?.[code] ?? 0;
  const onCampusCount = (code: string) => counts.on_campus_counts?.[code] ?? 0;

  return (
    <div className="space-y-4 text-slate-900">
      {/* Top Stepper Bar: 6 Hierarchies One by One */}
      <div className="bg-white border border-slate-300 rounded-2xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {hierarchy.title}
            </h2>
            <p className="text-xs font-medium text-slate-600">
              {hierarchy.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next Sequential Controls */}
            <button
              type="button"
              onClick={() => selectHierarchy((activeIdx - 1 + HIERARCHIES.length) % HIERARCHIES.length)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800"
            >
              ← Prev
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 px-1">
              {activeIdx + 1} / {HIERARCHIES.length}
            </span>
            <button
              type="button"
              onClick={() => selectHierarchy((activeIdx + 1) % HIERARCHIES.length)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800"
            >
              Next →
            </button>

            {/* Tree <-> Constellation Toggle */}
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-300 ml-1">
              <button
                type="button"
                onClick={() => setLayoutMode("tree")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                  layoutMode === "tree" ? "bg-slate-900 text-white" : "text-slate-700 hover:text-slate-950"
                }`}
              >
                Sequential Tree
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("constellation")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                  layoutMode === "constellation" ? "bg-slate-900 text-white" : "text-slate-700 hover:text-slate-950"
                }`}
              >
                Constellation
              </button>
            </div>
          </div>
        </div>

        {/* 6 Hierarchy Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {HIERARCHIES.map((h, idx) => {
            const active = idx === activeIdx;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => selectHierarchy(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {h.title} ({h.nodes.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: SVG Map + SysAdmin Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Hierarchy Canvas */}
        <div className="lg:col-span-8 bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full h-[460px] block select-none"
            style={{
              backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Edges */}
            {hierarchy.nodes.map((node) => {
              if (!node.parent) return null;
              const p1 = positions[node.parent];
              const p2 = positions[node.code];
              if (!p1 || !p2) return null;
              const inPath = lineage.has(node.code) && lineage.has(node.parent);
              const midY = (p1.y + p2.y) / 2;
              const d =
                layoutMode === "tree"
                  ? `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`
                  : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

              return (
                <path
                  key={`${node.parent}-${node.code}`}
                  d={d}
                  fill="none"
                  stroke={inPath ? hierarchy.accent : "#64748B"}
                  strokeWidth={inPath ? 2.6 : 1.5}
                  strokeOpacity={inPath ? 1 : 0.45}
                />
              );
            })}

            {/* Nodes */}
            {hierarchy.nodes.map((node) => {
              const pos = positions[node.code];
              if (!pos) return null;
              const isSelected = node.code === selectedCode;
              const inPath = lineage.has(node.code);
              const r = node.tier === 0 ? 24 : 20;

              return (
                <g
                  key={node.code}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  opacity={inPath ? 1 : 0.48}
                  className="cursor-pointer"
                  onClick={() => setSelectedCode(node.code)}
                >
                  {isSelected && (
                    <circle
                      r={r + 6}
                      fill={hierarchy.accent}
                      fillOpacity={0.16}
                      stroke={hierarchy.accent}
                      strokeWidth={2}
                    />
                  )}
                  <circle
                    r={r}
                    fill={node.tier === 0 ? "#0F172A" : "#FFFFFF"}
                    stroke={isSelected || inPath ? hierarchy.accent : "#475569"}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fontFamily="monospace"
                    fill={node.tier === 0 ? "#FFFFFF" : hierarchy.accent}
                  >
                    {node.short}
                  </text>
                  <text
                    y={r + 15}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight={isSelected ? "700" : "600"}
                    fill="#0F172A"
                  >
                    {node.label}
                  </text>
                  <text
                    y={r + 28}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#475569"
                  >
                    {userCount(node.code)} users · {onCampusCount(node.code)} in
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* SysAdmin Role Inspector */}
        <aside className="lg:col-span-4 bg-white border border-slate-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedNode.label}</h3>
                <code className="text-xs font-mono font-semibold text-slate-700">
                  role_key: {selectedNode.code}
                </code>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={{
                  backgroundColor: hierarchy.accentBg,
                  color: hierarchy.accentText,
                  borderColor: hierarchy.accent,
                }}
              >
                {selectedNode.surface}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">{selectedNode.summary}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-600">Active Users</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {userCount(selectedNode.code)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-600">On Campus</div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">
                  {onCampusCount(selectedNode.code)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Scope Boundary</span>
                <span className="font-mono font-bold text-slate-900">{selectedNode.scope}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Reports To</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedNode.parent ?? "Top of Chain"}
                </span>
              </div>
              {selectedNode.twoPerson && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                  Two-Person Rule: {selectedNode.twoPerson}
                </div>
              )}
            </div>

            {/* Live Backend Candidates for Selected Role */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>Live Backend Accounts ({selectedNode.code})</span>
                {loadingRole === selectedNode.code && (
                  <span className="text-slate-500">Loading…</span>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {(candidatesByRole[selectedNode.code] ?? []).length === 0 &&
                loadingRole !== selectedNode.code ? (
                  <div className="text-[11px] text-slate-500 italic">
                    No active accounts returned for this role.
                  </div>
                ) : (
                  (candidatesByRole[selectedNode.code] ?? []).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                        <div className="font-mono text-[10px] text-slate-600 truncate">
                          {c.unique_id ?? c.id}
                          {c.department_id ? ` · ${c.department_id}` : ""}
                          {c.assigned_hostel ? ` · ${c.assigned_hostel}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        {c.status ?? "ACTIVE"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {selectedNode.route && (
            <Link
              href={selectedNode.route}
              className="w-full text-center py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Open {selectedNode.label} Console →
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
