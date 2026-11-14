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
  hod: ["principal"],
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
              : "border-border bg-bg-surface/40 hover:bg-bg-surface"
          }`}
        >
          <button
            type="button"
            onClick={() => hasChildren && setExpanded((p) => ({ ...p, [node.code]: !p[node.code] }))}
            disabled={!hasChildren}
            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-text-muted ${
              hasChildren ? "hover:bg-bg-elevated cursor-pointer" : "opacity-0 cursor-default"
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
              <span className="size-4 rounded-full bg-bg-elevated" />
            )}
          </button>

          {isRoot ? (
            <ShieldCheck className="w-4 h-4 shrink-0 text-action-success" />
          ) : (
            <Building2 className="w-4 h-4 shrink-0 text-text-muted" />
          )}

          <div className="flex-1 min-w-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-xs font-bold ${isRoot ? "text-action-success" : "text-text-muted"}`}>
                {node.code}
              </span>
              {hasChildren && (
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  {node.children.length} sub-role{node.children.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <Users className="size-3.5" />
                <span className="font-mono font-bold text-white tabular-nums">{members}</span>
                user{members === 1 ? "" : "s"}
              </span>
              {showOnCampus && (
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    onCampus > 0 ? "text-action-success" : "text-text-muted"
                  }`}
                >
                  <Lock className="size-3.5" />
                  <span className="font-mono font-bold tabular-nums">{onCampus}</span>
                  in campus
                </span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className={`ml-4 border-l-2 border-border pl-4 ${compact ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2"}`}>
            {node.children.map((child) => (
              <div key={child.code} className="relative">
                <div className="absolute -left-4 top-1/2 h-0.5 w-4 bg-bg-elevated" />
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
          <span className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-elevated text-xs text-text-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-action-success" />
            {totals.roles} roles
          </span>
          <span className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-elevated text-xs text-text-secondary">
            <Users className="w-3.5 h-3.5 text-action-success" />
            {totals.members} total users
          </span>
          {showOnCampus && (
            <span className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-xs text-action-success">
              <Lock className="w-3.5 h-3.5" />
              {totals.onCampus} in campus
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={expandAll}
            className="surface-card px-3 py-1.5 bg-bg-elevated text-xs font-semibold text-text-secondary hover:text-white hover: transition"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="surface-card px-3 py-1.5 bg-bg-elevated text-xs font-semibold text-text-secondary hover:text-white hover: transition"
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
