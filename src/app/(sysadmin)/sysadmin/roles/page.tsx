"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  UserCog,
  Plus,
  ShieldCheck,
  Edit3,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Users,
  ArrowUpRight,
  KeyRound,
  Search,
  X,
  Network,
  RefreshCw,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";

/** Shape of the read-only /api/roles-graph response. */
interface RolesGraphPayload {
  root: string;
  nodes: {
    code: string;
    display_name: string;
    description: string;
    icon_name: string;
    default_redirect: string;
    user_count: number;
  }[];
  edges: { parent: string; child: string }[];
  user_counts: Record<string, number>;
  generated_at: string;
}

interface SystemRole {
  code: string;
  display_name: string;
  description: string;
  icon_name: string;
  default_redirect: string;
}

interface PickedUser {
  id: string;
  name: string;
  role: string;
  uniqueId?: string;
  email?: string;
}

/** Role -> pages it can access (drives the access matrix). */
const ROLE_ACCESS_MATRIX: { label: string; path: string; roles: string[] }[] = [
  { label: "Sysadmin Console", path: "/sysadmin", roles: ["sysadmin"] },
  { label: "Admin Dashboard", path: "/admin", roles: ["admin", "sysadmin"] },
  { label: "Principal / Approvals", path: "/principal/permissions", roles: ["principal", "vice_principal", "admin", "sysadmin"] },
  { label: "HOD Workspace", path: "/hod", roles: ["hod", "principal", "vice_principal", "admin", "sysadmin"] },
  { label: "Principal / Gate Ops", path: "/principal", roles: ["principal", "supervisor", "admin", "sysadmin"] },
  { label: "Supervisor Dashboard", path: "/supervisor", roles: ["supervisor", "principal", "admin", "sysadmin"] },
  { label: "Operator Gate", path: "/operator", roles: ["operator", "worker", "admin", "sysadmin"] },
  { label: "Worker Console", path: "/worker", roles: ["worker", "admin", "sysadmin"] },
  { label: "Faculty / Leaves", path: "/faculty/permissions", roles: ["faculty", "admin", "sysadmin"] },
  { label: "Staff Directory", path: "/staff", roles: ["staff", "admin", "sysadmin"] },
  { label: "Student Dashboard", path: "/student", roles: ["student", "admin", "sysadmin"] },
  { label: "Parent / Guardian", path: "/parent", roles: ["parent", "guardian", "admin", "sysadmin"] },
  { label: "Visitor Passes", path: "/visitor", roles: ["visitor", "admin", "sysadmin"] },
];

function displayNameForRole(role: string, roles: SystemRole[]): string {
  return roles.find((r) => r.code === role)?.display_name || role.replace(/_/g, " ");
}

/** Recursive tree node of the role DAG. */
interface HierarchyNode {
  code: string;
  children: HierarchyNode[];
}

function buildTreeFromGraph(graph: RolesGraphPayload | null, roles: SystemRole[]): HierarchyNode[] {
  // Prefer the server-provided DAG; fall back to config role list order.
  if (graph && graph.edges.length > 0) {
    const childrenByParent = new Map<string, string[]>();
    for (const e of graph.edges) {
      childrenByParent.set(e.parent, [...(childrenByParent.get(e.parent) || []), e.child]);
    }
    const known = new Set(graph.nodes.map((n) => n.code));
    // Guard against cycles in the DAG (e.g. principal -> vice_principal ->
    // hod -> principal): track the current recursion stack so a node already
    // on the stack is rendered as a leaf rather than recursed into, which
    // would otherwise throw "Maximum call stack size exceeded".
    const visiting = new Set<string>();
    const build = (code: string): HierarchyNode => ({
      code,
      children: visiting.has(code)
        ? []
        : (
            (() => {
              visiting.add(code);
              const kids = (childrenByParent.get(code) || [])
                .filter((c) => known.has(c))
                .map(build);
              visiting.delete(code);
              return kids;
            })()
          ),
    });
    return [graph.root].filter((c) => known.has(c)).map(build);
  }
  // Fallback: flat list of active definitions.
  return roles.map((r) => ({ code: r.code, children: [] }));
}

/** Parent lookup derived from the graph edges (used for revocation/demotion). */
function buildParents(graph: RolesGraphPayload | null): Record<string, string> {
  if (!graph) return {};
  const acc: Record<string, string> = {};
  for (const e of graph.edges) acc[e.child] = e.parent;
  return acc;
}

export default function RolesManagementPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [graph, setGraph] = useState<RolesGraphPayload | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleToDeactivate, setRoleToDeactivate] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);

  // ---- role hierarchy state ----
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [countLoading, setCountLoading] = useState(false);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  // ---- grant / revoke state ----
  const [grantRoleCode, setGrantRoleCode] = useState<string | null>(null);
  const [grantSearch, setGrantSearch] = useState("");
  const [grantResults, setGrantResults] = useState<PickedUser[]>([]);
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMsg, setGrantMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);

  // ---- HOD branch (department) assignment state ----
  const HOD_BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH"];
  const [hodUsers, setHodUsers] = useState<Array<{ id: string; name: string; department_id?: string | null; email?: string }>>([]);
  const [hodBranchMsg, setHodBranchMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hodBranchBusy, setHodBranchBusy] = useState<string | null>(null);

  const fetchHodUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?role=hod", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      const users: Array<{ id: string; name: string; department_id?: string | null; email?: string }> =
        Array.isArray(json?.data) ? json.data : [];
      setHodUsers(users);
    } catch {
      setHodUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchHodUsers();
  }, [fetchHodUsers]);

  const assignHodBranch = async (userId: string, branch: string) => {
    setHodBranchBusy(userId);
    setHodBranchMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ department_id: branch || null }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", message: branch ? `Branch ${branch} assigned` : "Branch cleared" });
        setHodUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, department_id: branch || null } : u))
        );
      } else {
        addToast({ variant: "error", message: json.error?.message || "Failed to save branch" });
      }
    } catch {
      addToast({ variant: "error", message: "Network error saving branch" });
    } finally {
      setHodBranchBusy(null);
    }
  };

  /** HOD users rendered in the tree, each with their assigned branch. */
  const hodTreeRows = useMemo(
    () =>
      hodUsers.map((u) => ({
        id: u.id,
        name: u.name,
        branch: u.department_id || "",
      })),
    [hodUsers]
  );

  const roleDisplayName = useCallback((code: string) => displayNameForRole(code, roles), [roles]);

  const tree = useMemo(() => buildTreeFromGraph(graph, roles), [graph, roles]);
  const roleParents = useMemo(() => buildParents(graph), [graph]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setGraphError(null);
    try {
      const [rolesRes, graphRes] = await Promise.all([
        fetch("/api/config/roles", { headers: getAuthHeaders() }),
        fetch("/api/roles-graph", { headers: getAuthHeaders(), cache: "no-store" }),
      ]);
      const rolesJson = await rolesRes.json();
      if (rolesJson.success) setRoles(rolesJson.data || []);

      const graphJson = await graphRes.json();
      if (graphRes.ok && graphJson.success) {
        setGraph(graphJson.data);
        // Expand top of the graph by default.
        setExpanded((prev) => ({ sysadmin: true, ...(prev.sysadmin === undefined ? { [graphJson.data.root]: true } : {}) }));
      } else {
        // Keep the page usable: fall back to the flat definitions list.
        setGraph(null);
        setGraphError(
          graphJson?.error?.message || "Role graph unavailable — showing definitions only"
        );
      }
    } catch {
      setGraph(null);
      setGraphError("Failed to load role hierarchy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const toggleExpand = (code: string) => setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
  const expandAll = () =>
    setExpanded(Object.fromEntries(tree.flatMap((n) => collectCodes(n)).map((c) => [c, true])));
  const collapseAll = () => setExpanded({});

  function collectCodes(node: HierarchyNode): string[] {
    return [node.code, ...node.children.flatMap(collectCodes)];
  }

  const refreshGraph = async () => {
    setCountLoading(true);
    try {
      const res = await fetch("/api/roles-graph", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setGraph(json.data);
        addToast({ variant: "info", message: "Role graph refreshed" });
      } else {
        addToast({ variant: "error", message: "Failed to refresh role graph" });
      }
    } catch {
      addToast({ variant: "error", message: "Network error refreshing role graph" });
    } finally {
      setCountLoading(false);
    }
  };

  // ---- grant / revoke role actions ----
  const openGrantPanel = (code: string) => {
    setGrantRoleCode(code);
    setGrantSearch("");
    setGrantResults([]);
    setGrantMsg(null);
    setGrantOpen(true);
  };
  const closeGrantPanel = () => {
    setGrantOpen(false);
    setGrantRoleCode(null);
    setGrantMsg(null);
  };

  const searchUsers = async (q: string) => {
    setGrantSearch(q);
    if (q.trim().length < 1) {
      setGrantResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q.trim())}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      setGrantResults(Array.isArray(json?.data) ? json.data.slice(0, 12) : []);
    } catch {
      setGrantResults([]);
    }
  };

  const grantRole = async (user: PickedUser) => {
    if (!grantRoleCode) return;
    setGrantBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role: grantRoleCode }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", message: `Granted '${grantRoleCode}' to ${user.name}` });
        setGrantOpen(false);
        refreshGraph();
      } else {
        addToast({ variant: "error", message: json.error?.message || "Failed to grant role" });
      }
    } catch {
      addToast({ variant: "error", message: "Network error granting role" });
    } finally {
      setGrantBusy(false);
    }
  };

  const revokeRole = async (user: PickedUser) => {
    if (!grantRoleCode) return;
    // Revoke = demote the user to their parent role in the hierarchy.
    const targetRole = roleParents[grantRoleCode];
    if (!targetRole) {
      addToast({
        variant: "error",
        message: `No parent role configured for '${grantRoleCode}'. Reassign manually — automatic demotion is disabled.`,
      });
      return;
    }
    setGrantBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({
          variant: "success",
          message: `Revoked '${grantRoleCode}' from ${user.name} → demoted to '${targetRole}'`,
        });
        setGrantOpen(false);
        refreshGraph();
      } else {
        addToast({ variant: "error", message: json.error?.message || "Failed to revoke role" });
      }
    } catch {
      addToast({ variant: "error", message: "Network error revoking role" });
    } finally {
      setGrantBusy(false);
    }
  };

  // ---- per-role user counts (client-side role filter against /api/users) ----
  const roleCodes = useMemo(() => roles.map((r) => r.code), [roles]);
  const fetchUserCounts = async () => {
    setCountLoading(true);
    try {
      const res = await fetch("/api/users", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      const users: PickedUser[] = Array.isArray(json?.data) ? json.data : [];
      const counts: Record<string, number> = {};
      roleCodes.forEach((c) => (counts[c] = 0));
      users.forEach((u) => {
        const role = u ? u.role : undefined;
        if (role && counts[role] !== undefined) counts[role] += 1;
      });
      setUserCounts(counts);
    } catch {
      setUserCounts({});
    } finally {
      setCountLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCounts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole?.code || !editingRole?.display_name) return;

    try {
      const res = await fetch("/api/config/roles", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(editingRole),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", message: `Saved role ${editingRole.code}` });
        setEditingRole(null);
        fetchRoles();
        fetchUserCounts();
      } else {
        addToast({ variant: "error", message: json.error?.message || "Failed to save role" });
      }
    } catch {
      addToast({ variant: "error", message: "Network error saving role" });
    }
  };

  const handleDelete = (code: string) => setRoleToDeactivate(code);

  const confirmDeactivateRole = async () => {
    if (!roleToDeactivate) return;
    try {
      const res = await fetch(`/api/config/roles?code=${roleToDeactivate}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", message: `Deactivated role ${roleToDeactivate}` });
        fetchRoles();
      } else {
        addToast({ variant: "error", message: json.error?.message || "Failed to deactivate role" });
      }
    } catch {
      addToast({ variant: "error", message: "Network error deactivating role" });
    } finally {
      setRoleToDeactivate(null);
    }
  };

  // ---------------------------------------------------------------- render

  const renderTreeNode = (node: HierarchyNode, depth = 0): React.ReactNode => {
    const isExpanded = !!expanded[node.code];
    const hasChildren = node.children.length > 0;
    const graphNode = graph?.nodes.find((n) => n.code === node.code);
    const count = graphNode?.user_count ?? graph?.user_counts[node.code];
    const isRoot = node.code === graph?.root;

    return (
      <div key={node.code} className="relative">
        {/* node card */}
        <div
          className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
            isRoot
              ? "border-purple-500/50 bg-purple-500/10"
              : "border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)]"
          }`}
        >
          <button
            onClick={() => hasChildren && toggleExpand(node.code)}
            disabled={!hasChildren}
            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-muted)] ${
              hasChildren ? "hover:bg-[var(--border)] cursor-pointer" : "opacity-0 cursor-default"
            }`}
            aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" />
            )}
          </button>

          <ShieldCheck
            className={`w-4 h-4 shrink-0 ${
              isRoot ? "text-purple-400" : "text-[var(--text-muted)]"
            }`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-purple-400">{node.code}</span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {graphNode?.display_name || roleDisplayName(node.code)}
              </span>
              {hasChildren && (
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  {node.children.length} sub-role{node.children.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Users className="w-3 h-3" />
                {countLoading && count === undefined ? (
                  <span className="inline-block w-8 h-3 bg-[var(--border)] rounded animate-pulse" />
                ) : (
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {count ?? 0}
                  </span>
                )}
                user{(count ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openGrantPanel(node.code)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/40 transition"
              title={`Grant / revoke '${node.code}' role`}
            >
              <KeyRound className="w-3 h-3" />
              Grant
            </button>
            {graphNode?.default_redirect && (
              <Link
                href={graphNode.default_redirect}
                target="_blank"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-[10px] font-semibold text-purple-300 hover:bg-purple-500/30 transition"
                title={`Open the ${graphNode.display_name} dashboard`}
              >
                <ArrowUpRight className="w-3 h-3" />
                View Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* HOD node: per-user branch assignment + current branch shown next to each name */}
        {node.code === "hod" && isExpanded && (
          <div className="mt-2 ml-4 border-l-2 border-[var(--border)] pl-4 space-y-2">
            {hodTreeRows.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] py-2">
                No HOD users yet. Grant the &lsquo;hod&rsquo; role above, then assign a branch.
              </div>
            ) : (
              hodTreeRows.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3 py-2"
                >
                  <Users className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)] flex-1 min-w-0 truncate">
                    {u.name}
                  </span>
                  {u.branch ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                      {u.branch}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--border)]/40 text-[10px] font-semibold text-[var(--text-muted)] uppercase">
                      No branch
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-semibold">
                    Branch
                    <select
                      value={u.branch}
                      disabled={hodBranchBusy === u.id}
                      onChange={(e) => void assignHodBranch(u.id, e.target.value)}
                      className="min-w-[92px] px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                      aria-label={`Assign branch to ${u.name}`}
                    >
                      <option value="">— none —</option>
                      {HOD_BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))
            )}
            {hodBranchMsg && (
              <div
                className={`text-xs flex items-center gap-1.5 ${
                  hodBranchMsg.type === "success" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {hodBranchMsg.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                {hodBranchMsg.text}
              </div>
            )}
          </div>
        )}

        {/* children with CSS connector lines (no graph library) */}
        {hasChildren && isExpanded && (
          <div className="mt-2 ml-4 border-l-2 border-[var(--border)] pl-4 space-y-2">
            {node.children.map((child) => (
              <div key={child.code} className="relative">
                <div className="absolute -left-4 top-1/2 h-0.5 w-4 bg-[var(--border)]" />
                {renderTreeNode(child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const matrixRoles = useMemo(() => [...new Set(ROLE_ACCESS_MATRIX.flatMap((p) => p.roles))], []);

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
<<<<<<< HEAD
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
=======
            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
              <UserCog className="w-6 h-6 text-purple-400" />
              Roles &amp; Authorization Policies
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Manage system role definitions, hierarchy, user assignments, and page access
            </p>
          </div>
          <button
            onClick={() =>
              setEditingRole({
                code: "",
                display_name: "",
                description: "",
                icon_name: "User",
                default_redirect: "/profile",
              })
            }
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Define System Role
          </button>
        </div>

        {/* ------------------------------------------------ role hierarchy graph (from /api/roles-graph) */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-400" />
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Role Hierarchy Graph</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {graph
                    ? `Served by /api/roles-graph · ${graph.nodes.length} nodes · ${graph.edges.length} edges · ${new Date(graph.generated_at).toLocaleTimeString()}`
                    : graphError
                      ? graphError
                      : "Loading role hierarchy…"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void refreshGraph()}
                disabled={countLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-muted)] hover:text-purple-400 transition disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
              <button
                onClick={expandAll}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-muted)] hover:text-purple-400 transition"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-muted)] hover:text-purple-400 transition"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {loading ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-sm animate-pulse">
                Loading role hierarchy…
              </div>
            ) : tree.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                No roles defined yet. Use &ldquo;Define System Role&rdquo; to add one.
              </div>
            ) : (
              tree.map((node) => renderTreeNode(node))
            )}
          </div>
        </div>

        {/* ------------------------------------------------ role access matrix */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Role Access Matrix</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Which roles can reach which pages. Filled dot = direct access; hatched dot = inherited
              (admin/sysadmin always reach admin-tier pages).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase">
                <tr>
                  <th className="p-3 font-semibold">Page</th>
                  <th className="p-3 font-mono text-emerald-400 font-semibold">Route</th>
                  {matrixRoles.map((r) => (
                    <th key={r} className="p-3 text-center font-mono font-semibold">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {ROLE_ACCESS_MATRIX.map((page) => {
                  // Inherited access: admin-tier pages are reachable by admin/sysadmin.
                  const isPrivilegedPage = page.roles.includes("sysadmin");
                  return (
                    <tr key={page.path} className="hover:bg-[var(--bg-elevated)]/40 transition">
                      <td className="p-3 font-semibold text-[var(--text-primary)]">{page.label}</td>
                      <td className="p-3 font-mono text-emerald-400">{page.path}</td>
                      {matrixRoles.map((r) => {
                        const direct = page.roles.includes(r);
                        const inherited =
                          !direct && isPrivilegedPage && (r === "sysadmin" || r === "admin");
                        return (
                          <td key={r} className="p-3 text-center">
                            {direct ? (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"
                                title={`Direct access for ${r}`}
                              />
                            ) : inherited ? (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400/30 border border-emerald-400/50"
                                title={`Inherited access for ${r}`}
                              />
                            ) : (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full border border-[var(--border)]"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------ role definitions table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Role Definitions</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm animate-pulse">
              Loading system role configurations…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[650px]">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-xs">
                  <tr>
                    <th className="p-4">Role Code</th>
                    <th className="p-4">Display Name</th>
                    <th className="p-4">Icon Token</th>
                    <th className="p-4">Default Redirect Route</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {roles.map((r) => (
                    <tr key={r.code} className="hover:bg-[var(--bg-elevated)]/50 transition">
                      <td className="p-4 font-mono font-bold text-purple-400">{r.code}</td>
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          {r.display_name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {r.description || "No description"}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{r.icon_name}</td>
                      <td className="p-4 font-mono text-xs text-emerald-400">{r.default_redirect}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingRole(r)}
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-purple-400 transition"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ------------------------------------------------ grant / revoke panel */}
        {grantOpen && grantRoleCode && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Grant / Revoke &lsquo;{grantRoleCode}&rsquo;
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Search a user, then grant them this role or revoke it (demotes to the parent
                    role).
                  </p>
                </div>
                <button
                  onClick={closeGrantPanel}
                  className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>

              {grantMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    grantMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {grantMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  {grantMsg.text}
                </div>
              )}

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  autoFocus
                  value={grantSearch}
                  onChange={(e) => searchUsers(e.target.value)}
                  placeholder="Search by name, email, or ID…"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-400"
                />
                {grantSearch && (
                  <button
                    onClick={() => {
                      setGrantSearch("");
                      setGrantResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-rose-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {grantResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                  {grantResults.map((u) => {
                    const hasRole = u.role === grantRoleCode;
                    return (
                      <div
                        key={u.id}
                        className="p-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)]/50 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {u.name}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] font-mono truncate">
                            current: <span className="text-purple-400">{u.role}</span>
                            {u.uniqueId ? ` · ${u.uniqueId}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => grantRole(u)}
                          disabled={grantBusy || hasRole}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                            hasRole
                              ? "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          }`}
                        >
                          {hasRole ? "Current" : "Grant"}
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeRole(u)}
                          disabled={grantBusy || !roleParents[grantRoleCode]}
                          title={
                            !roleParents[grantRoleCode]
                              ? "Role graph unavailable — assign a replacement role manually"
                              : `Demote to '${roleParents[grantRoleCode]}'`
                          }
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {grantSearch.trim().length > 1 && grantResults.length === 0 && !grantBusy && (
                <div className="text-center text-xs text-[var(--text-muted)] py-4">
                  No users match &ldquo;{grantSearch}&rdquo;
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-[var(--border)]">
                <button
                  onClick={closeGrantPanel}
                  className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-xl text-xs font-semibold hover:bg-[var(--border)] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ create / edit role form (existing) */}
        {editingRole && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingRole.code ? "Edit Role Configuration" : "Define New System Role"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Role Code (Unique Key)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRole.code || ""}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, code: e.target.value.toLowerCase() })
                    }
                    placeholder="e.g. supervisor"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRole.display_name || ""}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, display_name: e.target.value })
                    }
                    placeholder="e.g. Gate Supervisor"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingRole.description || ""}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, description: e.target.value })
                    }
                    placeholder="Scope of authority..."
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Lucide Icon Token
                    </label>
                    <input
                      type="text"
                      value={editingRole.icon_name || ""}
                      onChange={(e) =>
                        setEditingRole({ ...editingRole, icon_name: e.target.value })
                      }
                      placeholder="e.g. Shield"
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Default Route Redirect
                    </label>
                    <input
                      type="text"
                      value={editingRole.default_redirect || ""}
                      onChange={(e) =>
                        setEditingRole({ ...editingRole, default_redirect: e.target.value })
                      }
                      placeholder="e.g. /admin"
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingRole(null)}
                    className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-xl text-xs font-semibold hover:bg-[var(--border)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-semibold hover:bg-purple-600 transition"
                  >
                    Save Role
                  </button>
                </div>
                <ConfirmDialog
                  open={!!roleToDeactivate}
                  onClose={() => setRoleToDeactivate(null)}
                  title="Deactivate role?"
                  body={`Deactivate role "${roleToDeactivate ?? ""}"? This is audited.`}
                  confirmText="Deactivate"
                  variant="destructive"
                  onConfirm={confirmDeactivateRole}
                />
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
