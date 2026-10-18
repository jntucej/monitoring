"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Users, Search, X, ChevronDown, ChevronRight,
  ArrowUpRight, Network, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

/**
 * Admin Roles & Hierarchy — re-skin of the role tree + access matrix.
 *
 * Reads `/api/roles-graph` (nodes + edges + live user / on-campus counts) and
 * renders: KPI row (roles / users / on campus) + an expandable hierarchy tree
 * with active-pct bars + a membership-by-role panel that links into the full
 * sysadmin role panel. Glass chrome + Mini* kit.
 */

interface RolesGraphPayload {
  root: string;
  nodes: Array<{
    code: string;
    display_name: string;
    description?: string;
    user_count: number;
    on_campus: number;
  }>;
  edges: Array<{ parent: string; child: string }>;
  user_counts: Record<string, number>;
  on_campus_counts: Record<string, number>;
  totals: { roles: number; users: number; onCampus: number };
  generated_at?: string;
}

interface TreeNode {
  code: string;
  display_name: string;
  user_count: number;
  on_campus: number;
  children: TreeNode[];
}

async function fetchGraph(): Promise<RolesGraphPayload> {
  const res = await fetch("/api/roles-graph", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`roles-graph → ${res.status}`);
  const body = await res.json();
  return (body?.data ?? body) as RolesGraphPayload;
}

function buildTree(p: RolesGraphPayload): TreeNode[] {
  const byCode = new Map<string, TreeNode>();
  for (const n of p.nodes) {
    byCode.set(n.code, {
      code: n.code,
      display_name: n.display_name,
      user_count: n.user_count,
      on_campus: n.on_campus,
      children: [],
    });
  }
  const childSet = new Set<string>();
  for (const e of p.edges) {
    const parent = byCode.get(e.parent);
    const child = byCode.get(e.child);
    if (parent && child) {
      parent.children.push(child);
      childSet.add(e.child);
    }
  }
  // Roots are the nodes that are never a child.
  return Array.from(byCode.values()).filter((n) => !childSet.has(n.code));
}

function Node({
  node,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (code: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.code);
  const activePct =
    node.user_count > 0 ? (node.on_campus / node.user_count) * 100 : 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && onToggle(node.code)}
        className="flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 hover:bg-[var(--bg-surface)]/60 group"
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <ShieldCheck className="w-4 h-4 text-[var(--action-primary)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {node.display_name}
        </span>
        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--bg-surface)]/80 text-[var(--text-muted)]">
          {node.code}
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs">
          <span className="tabular-nums text-[var(--text-muted)]">
            {node.user_count} users
          </span>
          <span className="flex items-center gap-1 tabular-nums text-[var(--action-primary)]">
            <Users className="w-3 h-3" /> {node.on_campus}
          </span>
          <span
            className="w-12 h-1.5 rounded-full bg-[var(--bg-surface)]/60 overflow-hidden hidden sm:block"
            title={`${Math.round(activePct)}% on campus`}
          >
            <span
              className="block h-full bg-[var(--action-primary)]"
              style={{ width: `${Math.min(100, activePct)}%` }}
            />
          </span>
        </span>
      </button>

      {hasChildren && isOpen && (
        <div className="ml-4 border-l border-[var(--border)] pl-2">
          {node.children.map((c) => (
            <Node key={c.code} node={c} expanded={expanded} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminRolesInner() {
  const [data, setData] = useState<RolesGraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const g = await fetchGraph();
      setData(g);
      // Expand all top-level roots by default.
      const roots = buildTree(g);
      setExpanded(new Set(roots.map((r) => r.code)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roles");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, { intervalMs: 60_000 });

  const tree = useMemo(() => (data ? buildTree(data) : []), [data]);

  const filteredNodes = useMemo(() => {
    if (!data || !query.trim()) return null;
    const q = query.trim().toLowerCase();
    return data.nodes.filter(
      (n) =>
        n.code.toLowerCase().includes(q) ||
        n.display_name.toLowerCase().includes(q),
    );
  }, [data, query]);

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    setExpanded(new Set(data.nodes.map((n) => n.code)));
  };
  const collapseAll = () => setExpanded(new Set());

  if (!data && !error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Roles & Hierarchy"
        subtitle="Role graph, membership, and on-campus presence"
        onRefresh={load}
      />

      {error && (
        <div className="glass-card border border-[var(--action-danger)]/30 p-3 text-sm text-[var(--action-danger)]">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Roles defined
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.totals.roles ?? 0}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Users className="w-3.5 h-3.5" /> Total users
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.totals.users ?? 0}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Network className="w-3.5 h-3.5" /> On campus
          </div>
          <p className="text-2xl font-bold text-[var(--action-primary)] tabular-nums">
            {data?.totals.onCampus ?? 0}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/40 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/40"
          />
        </div>
        <button
          onClick={expandAll}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-surface)]/60"
        >
          Expand all
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-surface)]/60"
        >
          Collapse all
        </button>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-surface)]/60"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hierarchy */}
        <div className="lg:col-span-2">
          <WidgetBoundary title="Hierarchy">
            <div className="glass-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
                Role hierarchy
              </h2>

              {filteredNodes ? (
                <ul className="space-y-1.5">
                  {filteredNodes.map((n) => (
                    <li
                      key={n.code}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-[var(--bg-surface)]/40"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
                        <span className="text-sm text-[var(--text-primary)] truncate">
                          {n.display_name}
                        </span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--bg-surface)]/80 text-[var(--text-muted)]">
                          {n.code}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                        {n.user_count} users
                      </span>
                    </li>
                  ))}
                  {!filteredNodes.length && (
                    <li className="text-xs text-[var(--text-muted)] py-4 text-center">
                      No roles match
                    </li>
                  )}
                </ul>
              ) : (
                <div className="space-y-1">
                  {tree.map((n) => (
                    <Node key={n.code} node={n} expanded={expanded} onToggle={toggle} />
                  ))}
                </div>
              )}
            </div>
          </WidgetBoundary>
        </div>

        {/* Membership */}
        <WidgetBoundary title="Membership">
          <div className="glass-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Membership by role
            </h2>
            <ul className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {(data?.nodes ?? [])
                .slice()
                .sort((a, b) => b.user_count - a.user_count)
                .map((n) => {
                  const pct = data?.totals.users
                    ? (n.user_count / data.totals.users) * 100
                    : 0;
                  return (
                    <li key={n.code} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-primary)] truncate">
                          {n.display_name}
                        </span>
                        <span className="tabular-nums text-[var(--text-muted)]">
                          {n.user_count} · {n.on_campus}
                        </span>
                      </div>
                      <div className="h-1.5 mt-1 rounded-full bg-[var(--bg-surface)]/60 overflow-hidden">
                        <div
                          className="h-full bg-[var(--action-primary)]"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
            <Link
              href="/sysadmin/roles"
              className="mt-3 flex items-center justify-center gap-1 text-xs text-[var(--action-primary)] hover:underline"
            >
              Full sysadmin role panel <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </WidgetBoundary>
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    
      <AdminRolesInner />
    
    

  );
}
