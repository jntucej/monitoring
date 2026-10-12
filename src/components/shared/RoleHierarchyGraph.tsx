"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Users,
  Building2,
  Lock,
} from "lucide-react";

/**
 * Role-hierarchy DAG shape shared by the sysadmin Roles page and the admin
 * Roles dashboard. Mirrors the hard-coded hierarchy the sysadmin page uses
 * so both views render identically.
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  sysadmin: ["admin"],
  admin: ["principal"],
  principal: ["vice_principal"],
  vice_principal: ["hod"],
  hod: ["warden"],
  warden: ["supervisor"],
  supervisor: ["operator", "faculty", "staff", "worker"],
  operator: ["student"],
  faculty: ["student"],
  staff: ["parent"],
  worker: ["guardian"],
  parent: ["guardian"],
  guardian: [],
};

export const HIERARCHY_ROOT = "sysadmin";

export interface RoleGraphCounts {
  /** Direct user counts per role code */
  members: Record<string, number>;
  /** Users currently inside the campus per role code (on-campus presence) */
  onCampus: Record<string, number>;
  /** Totals derived from `members` */
  totals: { roles: number; members: number; onCampus: number };
}

export interface RoleHierarchyGraphProps {
  /**
   * Role code -> { members, onCampus }. Both fields optional; missing keys
   * render as 0. Codes not present in ROLE_HIERARCHY are ignored.
   */
  counts?: Record<string, { members?: number; onCampus?: number }>;
  /** Expand these nodes on mount (default: root only). */
  initiallyExpanded?: string[];
  /** Hide "in campus" badges / totals (default false). */
  showOnCampus?: boolean;
  /** Compact vertical spacing for embedded use. */
  compact?: boolean;
}

interface HierarchyNode {
  code: string;
  children: HierarchyNode[];
}

function buildTree(): HierarchyNode[] {
  const build = (code: string): HierarchyNode => ({
    code,
    children: (ROLE_HIERARCHY[code] || []).map(build),
  });
  return [HIERARCHY_ROOT].map(build);
}

export function RoleHierarchyGraph({
  counts,
  initiallyExpanded,
  showOnCampus = true,
  compact = false,
}: RoleHierarchyGraphProps) {
  const tree = useMemo(() => buildTree(), []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((initiallyExpanded ?? [HIERARCHY_ROOT]).map((c) => [c, true]))
  );

  const totals = useMemo(() => {
    let roles = 0;
    let members = 0;
    let onCampus = 0;
    const visit = (n: HierarchyNode) => {
      roles += 1;
      const c = counts?.[n.code];
      members += c?.members ?? 0;
      onCampus += c?.onCampus ?? 0;
      n.children.forEach(visit);
    };
    tree.forEach(visit);
    return { roles, members, onCampus };
  }, [tree, counts]);

  const expandAll = () =>
    setExpanded(Object.fromEntries(Object.keys(ROLE_HIERARCHY).map((c) => [c, true])));
  const collapseAll = () => setExpanded({});

  const renderNode = (node: HierarchyNode): React.ReactNode => {
    const isExpanded = !!expanded[node.code];
    const hasChildren = node.children.length > 0;
    const c = counts?.[node.code];
    const members = c?.members ?? 0;
    const onCampus = c?.onCampus ?? 0;
    const isRoot = node.code === HIERARCHY_ROOT;

    return (
      <div key={node.code} className="relative">
        <div
          className={`group flex items-center gap-3 rounded-xl border transition ${
            compact ? "px-2.5 py-1.5" : "px-3 py-2.5"
          } ${
            isRoot
              ? "border-emerald-500/40 bg-emerald-500/[0.08]"
              : "border-slate-800 bg-slate-900/40 hover:bg-slate-900"
          }`}
        >
          <button
            type="button"
            onClick={() => hasChildren && setExpanded((p) => ({ ...p, [node.code]: !p[node.code] }))}
            disabled={!hasChildren}
            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 ${
              hasChildren ? "hover:bg-slate-800 cursor-pointer" : "opacity-0 cursor-default"
            }`}
            aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            )}
          </button>

          {isRoot ? (
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <Building2 className="w-4 h-4 shrink-0 text-slate-500" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-xs font-bold ${isRoot ? "text-emerald-400" : "text-slate-400"}`}>
                {node.code}
              </span>
              {hasChildren && (
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {node.children.length} sub-role{node.children.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Users className="w-3 h-3" />
                <span className="font-mono font-bold text-white tabular-nums">{members}</span>
                user{members === 1 ? "" : "s"}
              </span>
              {showOnCampus && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] ${
                    onCampus > 0 ? "text-emerald-400" : "text-slate-600"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span className="font-mono font-bold tabular-nums">{onCampus}</span>
                  in campus
                </span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className={`ml-4 border-l-2 border-slate-800 pl-4 ${compact ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2"}`}>
            {node.children.map((child) => (
              <div key={child.code} className="relative">
                <div className="absolute -left-4 top-1/2 h-0.5 w-4 bg-slate-800" />
                {renderNode(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {totals.roles} roles
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            {totals.members} total users
          </span>
          {showOnCampus && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300">
              <Lock className="w-3.5 h-3.5" />
              {totals.onCampus} in campus
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {tree.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
