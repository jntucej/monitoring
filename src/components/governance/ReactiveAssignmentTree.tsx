"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Home,
  Search,
  UserPlus,
  Users,
  AlertCircle,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import type { Person } from "@/lib/types";

interface DepartmentItem {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}

interface HostelBlock {
  id?: string;
  name?: string;
  block_name?: string;
  capacity?: number;
  total_rooms?: number;
  occupied?: number;
}

interface TreeNode {
  id: string;
  level: 1 | 2 | 3;
  kind: "institution" | "department" | "hostel";
  label: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string | number }>;
  deptCode?: string;
  blockName?: string;
  children?: TreeNode[];
}

export function ReactiveAssignmentTree() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const role = (user?.role ?? "").toLowerCase();
  const isHod = role === "hod";
  const hodDept = (user as { department?: string | null } | null)?.department ?? null;

  const { data: acadData } = useApiResource<{ data?: { departments?: DepartmentItem[] } }>(
    "/api/vp/academics",
    { ttlMs: 60_000 },
  );
  const { data: hostelData } = useApiResource<{ data?: HostelBlock[] }>(
    "/api/hostel/blocks",
    { ttlMs: 60_000 },
  );
  const { data: personsData, refresh: refreshPersons } = useApiResource<{ data?: Person[] }>(
    "/api/persons?limit=200",
    { ttlMs: 30_000 },
  );

  const departments = useMemo(() => {
    const all = acadData?.data?.departments ?? [];
    if (isHod && hodDept) {
      return all.filter(
        (d) =>
          d.code.toLowerCase() === hodDept.toLowerCase() ||
          d.name.toLowerCase() === hodDept.toLowerCase(),
      );
    }
    return all;
  }, [acadData, isHod, hodDept]);

  const blocks = useMemo(() => {
    if (isHod) return [];
    return Array.isArray(hostelData?.data) ? hostelData.data : [];
  }, [hostelData, isHod]);

  const people = useMemo(
    () => (Array.isArray(personsData?.data) ? personsData.data : []),
    [personsData],
  );

  const students = useMemo(
    () => people.filter((p) => (p.role ?? p.personType ?? "").toLowerCase() === "student"),
    [people],
  );

  const treeNodes: TreeNode[] = useMemo(() => {
    const deptNodes: TreeNode[] = departments.map((d) => ({
      id: `dept:${d.code}`,
      level: 2,
      kind: "department",
      label: `${d.name} (${d.code})`,
      subtitle: `HOD: ${d.hodName ?? "Unassigned"}`,
      deptCode: d.code,
      metrics: [
        { label: "Students", value: d.students },
        { label: "Faculty", value: d.faculty },
        { label: "Attendance", value: `${d.attendancePct}%` },
      ],
    }));

    const hostelNodes: TreeNode[] = blocks.map((b, idx) => {
      const name = b.name ?? b.block_name ?? `Block ${idx + 1}`;
      return {
        id: `hostel:${b.id ?? name}`,
        level: 2,
        kind: "hostel",
        label: name,
        subtitle: "Hostel Block",
        blockName: name,
        metrics: [
          { label: "Occupied", value: b.occupied ?? 0 },
          { label: "Capacity", value: b.capacity ?? b.total_rooms ?? 0 },
        ],
      };
    });

    return [
      {
        id: "institution",
        level: 1,
        kind: "institution",
        label: isHod && hodDept ? `${hodDept} Department Tree` : "JNTUH CEJ Institutional Tree",
        subtitle: isHod ? "Department Cohort & Faculty Scope" : "Principal · VP · Admin · SysAdmin",
        metrics: [
          { label: "Departments", value: departments.length },
          { label: "Students Loaded", value: students.length },
          { label: "Hostel Blocks", value: blocks.length },
        ],
        children: [...deptNodes, ...hostelNodes],
      },
    ];
  }, [departments, blocks, students.length, isHod, hodDept]);

  const [selectedId, setSelectedId] = useState<string>("institution");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ institution: true });
  const [query, setQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState("");
  const [assignRole, setAssignRole] = useState<"cr" | "faculty" | "hostel">("cr");

  const allFlatNodes = useMemo(() => {
    const out: TreeNode[] = [];
    for (const root of treeNodes) {
      out.push(root);
      for (const child of root.children ?? []) out.push(child);
    }
    return out;
  }, [treeNodes]);

  const selectedNode =
    allFlatNodes.find((n) => n.id === selectedId) ?? treeNodes[0];

  const filteredChildren = useMemo(() => {
    const q = query.trim().toLowerCase();
    const children = treeNodes[0]?.children ?? [];
    if (!q) return children;
    return children.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q),
    );
  }, [treeNodes, query]);

  const nodeStudents = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.kind === "department" && selectedNode.deptCode) {
      const code = selectedNode.deptCode.toLowerCase();
      return students.filter(
        (s) =>
          (s.department ?? "").toLowerCase() === code ||
          (s.uniqueId ?? "").toLowerCase().includes(code),
      );
    }
    if (selectedNode.kind === "hostel") {
      return students.filter((s) => Boolean((s as { isHosteller?: boolean }).isHosteller));
    }
    return students;
  }, [selectedNode, students]);

  const unlinkedCount = nodeStudents.filter(
    (s) => !(s as { guardianId?: string | null }).guardianId,
  ).length;

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetId.trim()) return;
    addToast({
      variant: "success",
      message: `Assignment queued (${assignRole.toUpperCase()}) for ${assignTargetId.trim()}`,
    });
    setAssignTargetId("");
    setAssignOpen(false);
    await refreshPersons();
  };

  return (
    <div
      data-testid="reactive-assignment-tree"
      className="w-full min-w-0 overflow-x-hidden space-y-4"
    >
      {/* Sticky Breadcrumb Pill Bar */}
      <nav
        aria-label="Hierarchy breadcrumb"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-bg-surface/95 px-3 py-2 backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setSelectedId("institution")}
          className="min-h-9 rounded-lg px-2.5 py-1 text-xs font-semibold text-action-primary hover:bg-bg-elevated"
        >
          Institution
        </button>
        {selectedNode && selectedNode.id !== "institution" && (
          <>
            <span className="text-xs text-text-muted">&rsaquo;</span>
            <span className="rounded-lg bg-action-primary/10 px-2.5 py-1 text-xs font-semibold text-action-primary">
              {selectedNode.label}
            </span>
          </>
        )}
      </nav>

      {/* Split Master-Detail Layout (Desktop 40/60, Mobile Accordion) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Pane: Searchable Collapsible Tree */}
        <aside className="md:col-span-5 surface-card bg-bg-surface p-3.5 space-y-3">
          <div className="relative">
            <Search className="size-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter departments or hostel blocks..."
              className="w-full min-h-9 rounded-lg border border-border bg-bg-base pl-8 pr-3 text-xs text-text-primary"
            />
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedId("institution");
                setExpanded((prev) => ({ ...prev, institution: !prev.institution }));
              }}
              className={`w-full min-h-10 rounded-lg border px-3 py-2 text-left flex items-center justify-between gap-2 ${
                selectedId === "institution"
                  ? "border-action-primary bg-action-primary/10"
                  : "border-border bg-bg-base hover:bg-bg-elevated"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {expanded.institution ? (
                  <ChevronDown className="size-4 shrink-0 text-text-muted" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-text-muted" />
                )}
                <Building2 className="size-4 shrink-0 text-action-primary" />
                <span className="text-xs font-semibold truncate">{treeNodes[0]?.label}</span>
              </div>
              <span className="font-mono text-[11px] text-text-muted shrink-0">
                {students.length}
              </span>
            </button>

            {expanded.institution && (
              <div className="pl-3 border-l border-border space-y-1.5">
                {filteredChildren.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className={`w-full min-h-10 rounded-lg border px-3 py-2 text-left flex items-center justify-between gap-2 ${
                      selectedId === node.id
                        ? "border-action-primary bg-action-primary/10"
                        : "border-border bg-bg-base hover:bg-bg-elevated"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {node.kind === "department" ? (
                        <GraduationCap className="size-3.5 shrink-0 text-action-primary" />
                      ) : (
                        <Home className="size-3.5 shrink-0 text-action-warning" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {node.label}
                        </p>
                        <p className="text-[11px] text-text-muted truncate">{node.subtitle}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-text-muted shrink-0">
                      {node.metrics[0]?.value ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right Pane: Selected Node Details, Gaps & Leaf Students */}
        <section className="md:col-span-7 surface-card bg-bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text-primary truncate">
                {selectedNode?.label}
              </h2>
              <p className="text-xs text-text-muted">{selectedNode?.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setAssignOpen((v) => !v)}
              className="min-h-9 inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
            >
              <UserPlus className="size-3.5" />
              <span>+ Assign People</span>
            </button>
          </div>

          {/* 2-column wrap metric grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(selectedNode?.metrics ?? []).map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-bg-base p-2.5">
                <p className="text-[11px] text-text-muted">{m.label}</p>
                <p className="text-lg font-semibold text-text-primary">{m.value}</p>
              </div>
            ))}
          </div>

          {unlinkedCount > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {unlinkedCount} student{unlinkedCount === 1 ? "" : "s"} in this scope missing a
                linked guardian record.
              </span>
            </div>
          )}

          {assignOpen && (
            <form
              onSubmit={handleQuickAssign}
              className="rounded-xl border border-border bg-bg-base p-3 space-y-2.5"
            >
              <p className="text-xs font-semibold text-text-primary">
                Quick Assign to {selectedNode?.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as "cr" | "faculty" | "hostel")}
                  className="min-h-9 rounded-lg border border-border bg-bg-surface px-2.5 text-xs"
                >
                  <option value="cr">Promote Student to CR</option>
                  <option value="faculty">Assign Faculty / Class Teacher</option>
                  <option value="hostel">Allocate Hostel Room</option>
                </select>
                <input
                  type="text"
                  required
                  value={assignTargetId}
                  onChange={(e) => setAssignTargetId(e.target.value)}
                  placeholder="Roll number or Employee ID..."
                  className="min-h-9 rounded-lg border border-border bg-bg-surface px-2.5 text-xs sm:col-span-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="min-h-9 rounded-lg bg-action-primary px-3 py-1 text-xs font-semibold text-white"
                >
                  Save Assignment
                </button>
                <button
                  type="button"
                  onClick={() => setAssignOpen(false)}
                  className="min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Leaf Student Nodes */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Users className="size-3.5" />
              Assigned Students ({nodeStudents.length})
            </h3>
            {nodeStudents.length === 0 ? (
              <p className="text-xs text-text-muted">
                No students matched this node scope yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nodeStudents.slice(0, 24).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="block rounded-lg border border-border bg-bg-base p-2.5 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {s.fullName || s.name || s.uniqueId}
                        </span>
                        <span className="font-mono text-[11px] text-action-primary shrink-0">
                          {s.uniqueId}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {s.department ?? "General"} ·{" "}
                        {(s as { isOnCampus?: boolean }).isOnCampus ? "ON CAMPUS" : "OFF CAMPUS"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
