"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { KeyRound } from "lucide-react";
import { EnrollmentCodeModal } from "@/components/sysadmin/EnrollmentCodeModal";
import { UserRolesPanel } from "@/components/sysadmin/UserRolesPanel";
import {
  Briefcase, Search, RefreshCw, UserPlus, Edit, Trash2,
  Ban, CheckCircle2, X, Mail, ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";

interface StaffRecord {
  id: string;
  uniqueId?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  designation?: string;
  status: "ACTIVE" | "SUSPENDED" | string;
  metadata?: Record<string, unknown>;
  hostel_scope?: string;
  hostelScope?: string;
}

interface StaffStats {
  total: number;
  active: number;
  suspended: number;
  byGroup: Array<{ group: string; count: number; color: string; roles: Array<{ role: string; count: number }> }>;
  byDepartment: Array<{ code: string; name: string; count: number }>;
  byStaffCategory: Array<{ category: string; count: number }>;
  byDesignation: Array<{ designation: string; count: number }>;
}

export default function SysAdminStaffPage() {
const api = useApi();

  const { addToast } = useUIStore();
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrollmentModalUser, setEnrollmentModalUser] = useState<{id: string, name: string} | null>(null);

  const [createForm, setCreateForm] = useState({
    employeeId: "", name: "", email: "", phone: "",
    role: "faculty", department: "CSE", designation: "Assistant Professor", hostelScope: "", customMetaJson: "{}",
  });

  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", role: "faculty",
    department: "", designation: "", hostelScope: "", customMetaJson: "{}",
    newPassword: "", newPin: "",
  });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { headers: api.getHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setStaffList(json.data.filter((u: { role?: string }) => u.role !== "student" && u.role !== "parent"));
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to load staff" });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error loading staff" });
    } finally { setLoading(false); }
  }, [addToast]);

  // Load once on mount. Staff rosters aren't live feeds (they change on
  // admin action), so no 30-second polling — the interval kept /api/users
  // and the stats endpoint hammering the rate-limit budget.
  useEffect(() => { loadStaff(); }, [loadStaff]);

  // Load the server-side staff statistics (role hierarchy / department /
  // category / designation) for the infographic row.
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/stats?role=${encodeURIComponent(roleFilter)}&dept=${encodeURIComponent(deptFilter)}&status=${encodeURIComponent(statusFilter)}`, {
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data as StaffStats);
    } catch {
      /* stats are non-critical; the table still renders */
    }
  }, [roleFilter, deptFilter, statusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);


  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      addToast({ variant: "error", title: "Validation", message: "Name is required." });
      return;
    }
    setBusy(true);
    try {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(createForm.customMetaJson || "{}"); } catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Custom metadata must be valid JSON." });
        setBusy(false); return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: createForm.employeeId?.trim() || null,
          name: createForm.name.trim(),
          email: createForm.email?.trim() || undefined,
          phone: createForm.phone?.trim() || null,
          role: createForm.role,
          departmentId: createForm.department || null,
          designation: createForm.designation || null,
          hostelScope: createForm.hostelScope || null,
          metadata: { ...parsedMeta, ...(createForm.hostelScope ? { hostel_scope: createForm.hostelScope } : {}) },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        addToast({ variant: "success", title: "Created", message: `${createForm.name} added.` });
        setShowCreateModal(false);
        setCreateForm({ employeeId: "", name: "", email: "", phone: "", role: "faculty", department: "CSE", designation: "Assistant Professor", hostelScope: "", customMetaJson: "{}" });
        loadStaff();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || json.message || `Failed to create staff (${res.status})` });
      }
    } catch (err: unknown) { addToast({ variant: "error", title: "Error", message: (err instanceof Error ? err.message : null) || "Network error." }); }
    finally { setBusy(false); }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setBusy(true);
    try {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(editForm.customMetaJson || "{}"); } catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Custom metadata must be valid JSON." });
        setBusy(false); return;
      }
      const res = await fetch(`/api/users/${editingStaff.id}`, {
        method: "PATCH",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name, email: editForm.email || undefined,
          phone: editForm.phone || undefined, role: editForm.role,
          department: editForm.department || undefined,
          designation: editForm.designation || undefined,
          metadata: { ...parsedMeta, ...(editForm.hostelScope ? { hostel_scope: editForm.hostelScope } : {}) },
          hostelScope: editForm.hostelScope || undefined,
          password: editForm.newPassword || undefined,
          pin: editForm.newPin || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({ variant: "success", title: "Updated", message: `${editForm.name} updated.` });
        setEditingStaff(null); loadStaff();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Update failed." });
      }
    } catch { addToast({ variant: "error", title: "Error", message: "Network error." }); }
    finally { setBusy(false); }
  };

  const handleToggleStatus = async (s: StaffRecord) => {
    const newStatus = s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/users/${s.id}`, {
        method: "PATCH",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        addToast({ variant: "success", title: newStatus === "ACTIVE" ? "Activated" : "Suspended", message: `${s.name} is now ${newStatus}.` });
        loadStaff();
      }
    } catch { addToast({ variant: "error", title: "Error", message: "Could not update status." }); }
  };

  const handleDeleteStaff = async (s: StaffRecord) => {
    if (!confirm(`Delete ${s.name} (${s.uniqueId || s.id})? This is irreversible.`)) return;
    try {
      const res = await fetch(`/api/users/${s.id}`, { method: "DELETE", headers: api.getHeaders() });
      if (res.ok) { addToast({ variant: "success", title: "Deleted", message: `${s.name} removed.` }); loadStaff(); }
    } catch { addToast({ variant: "error", title: "Error", message: "Could not delete." }); }
  };

  const openEditModal = (s: StaffRecord) => {
    setEditingStaff(s);
    setEditForm({
      name: s.name, email: s.email, phone: s.phone || "", role: s.role,
      department: s.department || "", designation: s.designation || "",
      hostelScope: (typeof s.metadata?.hostel_scope === "string" ? s.metadata.hostel_scope : "") || s.hostel_scope || s.hostelScope || "",
      customMetaJson: s.metadata ? JSON.stringify(s.metadata, null, 2) : "{}",
      newPassword: "", newPin: "",
    });
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !search || s.name.toLowerCase().includes(q) ||
        (s.uniqueId || "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) || (s.department || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "ALL" || s.role === roleFilter;
      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  const roleBadge = (role: string) => {
    const c: Record<string, string> = {
      sysadmin: "bg-exit-subtle border-action-danger",
      admin: "bg-action-warning/20 text-action-warning border-action-warning/30",
      faculty: "bg-bg-elevated text-text-primary border-border",
      operator: "bg-entry-subtle border-action-success",
      staff: "bg-bg-elevated text-text-secondary border-border",
      worker: "bg-unit-c/20 text-unit-c border-unit-c/30",
      caretaker: "bg-action-success/20 text-action-success border-action-success/30",
      deputy_warden: "bg-action-info/20 text-action-info border-action-info/30",
      hostel_manager: "bg-action-info/20 text-action-info border-action-info/30",
      principal: "bg-action-danger/20 text-action-danger border-action-danger/30",
      vice_principal: "bg-action-danger/20 text-action-danger border-action-danger/30",
      oie: "bg-unit-c/20 text-unit-c border-unit-c/30",
      exam_branch: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    };
    return c[role] || "bg-bg-elevated text-text-secondary border-border";
  };

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
              <Briefcase className="size-6 text-action-primary" />
              Staff &amp; Non-Students Management
            </p>
            <p className="text-sm text-text-muted mt-1">Manage faculty, operators, admins, and all non-student personnel. {staffList.length} records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowCreateModal(true)} className="surface-card flex items-center gap-2 px-4 py-2.5 min-h11 bg-action-success text-white text-sm font-semibold hover:bg-action-success">
              <UserPlus className="w-4 h-4" /> Add Staff
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w55">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Search by name, ID, email..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="surface-card w-full min-h11 pl-10 pr-4 py-2.5 bg-bg-surface text-sm text-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="surface-card bg-bg-surface px-3 py-2 min-h11 text-xs text-text-secondary">
              <option value="ALL">All Roles</option>
              <option value="sysadmin">SysAdmin</option><option value="admin">Admin</option>
              <option value="faculty">Faculty</option><option value="operator">Operator</option>
              <option value="staff">Staff</option><option value="worker">Worker</option>
              <optgroup label="Hostel">
                <option value="caretaker">Caretaker</option>
                <option value="deputy_warden">Deputy Warden</option>
                <option value="hostel_manager">Hostel Manager</option>
              </optgroup>
              <optgroup label="Academic">
                <option value="principal">Principal</option>
                <option value="vice_principal">Vice Principal</option>
                <option value="oie">OIE</option>
                <option value="exam_branch">Exam Branch</option>
              </optgroup>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="surface-card bg-bg-surface px-3 py-2 min-h11 text-xs text-text-secondary">
              <option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
            </select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="surface-card bg-bg-surface px-3 py-2 min-h11 text-xs text-text-secondary">
              <option value="ALL">All Departments</option>
              {(stats?.byDepartment ?? []).map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Infographics — staff hierarchy, department, category & designation */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="surface-card bg-bg-surface p-4 flex flex-col justify-between">
              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Staff</div>
              <div className="mt-2 text-3xl font-bold text-text-primary">{stats.total.toLocaleString()}</div>
              <div className="mt-1 text-xs text-action-success">{stats.active.toLocaleString()} active ({stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%)</div>
            </div>
            <div className="surface-card bg-bg-surface p-4 flex flex-col justify-between">
              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Role Groups</div>
              <div className="mt-2 text-3xl font-bold text-action-success">{stats.byGroup.length}</div>
              <div className="mt-1 text-xs text-text-muted">{stats.byGroup[0]?.group} leads ({stats.byGroup[0]?.count})</div>
            </div>
            <div className="surface-card bg-bg-surface p-4 sm:col-span-2">
              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3">Role Hierarchy (grouped)</div>
              <div className="space-y-2">
                {stats.byGroup.map((g) => (
                  <div key={g.group} className="flex items-center gap-2 text-xs">
                    <div className="w-6 text-text-primary truncate text-right">{g.group}</div>
                    <div className="flex-1 h-4 rounded-full bg-bg-elevated overflow-hidden">
                      <div className={`h-full rounded-full ${g.color}`} style={{ width: `${stats.total ? (g.count / stats.total) * 100 : 0}%` }} />
                    </div>
                    <div className="w-6 text-text-muted text-right">{g.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-card bg-bg-surface p-4">
              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3">Department</div>
              <div className="space-y-1.5 max-h-6 overflow-y-auto pr-1">
                {stats.byDepartment.map((d) => (
                  <div key={d.code} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 text-text-primary truncate">{d.name}</div>
                    <div className="w-6 text-text-muted text-right">{d.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-card bg-bg-surface p-4">
              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3">Staff Category</div>
              <div className="space-y-1.5 max-h-6 overflow-y-auto pr-1">
                {stats.byStaffCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 text-text-primary truncate">{c.category.replace(/_/g, " ")}</div>
                    <div className="w-6 text-text-muted text-right">{c.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-card bg-bg-surface p-4 sm:col-span-2">
              <div className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3">Top Designations</div>
              <div className="flex items-end gap-2 h-6">
                {(() => {
                  const max = stats.byDesignation.reduce((m, d) => Math.max(m, d.count), 0);
                  return stats.byDesignation.map((d) => (
                    <div key={d.designation} className="flex-1 flex flex-col items-center gap-1" title={`${d.designation}: ${d.count}`}>
                      <div className="text-xs text-text-muted">{d.count}</div>
                      <div className="w-full rounded-t bg-action-info" style={{ height: `${max ? Math.max(8, (d.count / max) * 48) : 0}px` }} />
                      <div className="text-xs text-text-muted truncate max-w-full">{d.designation}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w175">
              <thead>
                <tr className="bg-bg-elevated/60 text-xs text-text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted"><RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />Loading...</td></tr>
                ) : filteredStaff.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted">No staff members found.</td></tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-action-primary">{s.uniqueId || "—"}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                      <td className="px-4 py-3 text-text-muted text-xs"><Mail className="size-3.5 inline mr-1" />{s.email}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${roleBadge(s.role)}`}><ShieldCheck className="size-3.5" />{s.role}</span></td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{s.department || "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${s.status === "ACTIVE" ? "bg-entry-subtle" : "bg-exit-subtle"}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEnrollmentModalUser({ id: s.id, name: s.name })} className="surface-card p-2 min-h11 min-w11 flex items-center justify-center hover:bg-bg-elevated text-action-success" title="Enrollment Code"><KeyRound className="w-4 h-4" /></button>
                          <button onClick={() => openEditModal(s)} className="surface-card p-2 min-h11 min-w11 flex items-center justify-center hover:bg-bg-elevated text-action-info" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleToggleStatus(s)} className="surface-card p-2 min-h11 min-w11 flex items-center justify-center hover:bg-bg-elevated" title={s.status === "ACTIVE" ? "Suspend" : "Activate"}>{s.status === "ACTIVE" ? <Ban className="w-4 h-4 text-action-warning" /> : <CheckCircle2 className="w-4 h-4 text-action-primary" />}</button>
                          <button onClick={() => handleDeleteStaff(s)} className="surface-card p-2 min-h11 min-w11 flex items-center justify-center hover:bg-bg-elevated text-action-danger" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Create Modal */}
        {enrollmentModalUser && (
        <EnrollmentCodeModal
          userId={enrollmentModalUser.id}
          userName={enrollmentModalUser.name}
          onClose={() => setEnrollmentModalUser(null)}
        />
      )}

      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="surface-card flex items-center justify-between px-5 py-4">
                <h2 className="text-lg font-bold text-text-primary">Add New Staff</h2>
                <button onClick={() => setShowCreateModal(false)} className="surface-card p-2 min-h11 min-w11 flex items-center justify-center hover:bg-bg-elevated text-text-muted"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateStaff} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Employee ID <span className="font-normal text-text-muted">(optional — auto-generated if blank)</span></label>
                    <input type="text" value={createForm.employeeId} onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" placeholder="EMP-001 (leave blank to auto-generate)" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Full Name *</label>
                    <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Email</label>
                    <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Phone</label>
                    <input type="text" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Role</label>
                    <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:">
                  <option value="faculty">Faculty</option><option value="operator">Operator</option>
                  <option value="staff">Staff</option><option value="worker">Worker</option>
                  <option value="admin">Admin</option><option value="sysadmin">SysAdmin</option>
                  <optgroup label="Hostel">
                    <option value="caretaker">Caretaker</option>
                    <option value="deputy_warden">Deputy Warden</option>
                    <option value="hostel_manager">Hostel Manager</option>
                  </optgroup>
                  <optgroup label="Academic">
                    <option value="principal">Principal</option>
                    <option value="vice_principal">Vice Principal</option>
                    <option value="oie">OIE</option>
                    <option value="exam_branch">Exam Branch</option>
                  </optgroup>
                </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Department</label>
                    <input type="text" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} className="surface-card w-full px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Designation</label>
                    <input type="text" value={createForm.designation} onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })} className="surface-card w-full px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                </div>
            {["caretaker", "deputy_warden", "hostel_manager", "warden"].includes(createForm.role) && (
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1" htmlFor="hostel-scope">Hostel Scope</label>
                <input id="hostel-scope"
                  type="text"
                  placeholder="e.g. MH-1, LH-2, or ALL"
                  value={createForm.hostelScope}
                  onChange={(e) => setCreateForm({ ...createForm, hostelScope: e.target.value })}
                  className="surface-card w-full px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:"
                />
              </div>
            )}
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={3} value={createForm.customMetaJson} onChange={(e) => setCreateForm({ ...createForm, customMetaJson: e.target.value })} className="surface-card w-full px-3 py-2 bg-bg-elevated text-xs font-mono text-text-secondary focus:outline-none focus:" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="surface-card px-4 py-2 bg-bg-elevated text-text-secondary text-xs font-semibold hover:bg-bg-elevated">Cancel</button>
                  <button type="submit" disabled={busy} className="surface-card px-4 py-2 bg-action-success text-white text-xs font-semibold hover:bg-action-success disabled:opacity-50">{busy ? "Creating..." : "Create Staff"}</button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Edit Modal */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="surface-card flex items-center justify-between px-5 py-4">
                <h2 className="text-lg font-bold text-text-primary">Edit Staff — {editingStaff.uniqueId || editingStaff.id}</h2>
                <button onClick={() => setEditingStaff(null)} className="surface-card p-1 hover:bg-bg-elevated text-text-muted"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleEditStaff} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <UserRolesPanel userId={editingStaff.id} />
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Full Name</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Phone</label>
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Role</label>
                    <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:">
                  <option value="faculty">Faculty</option><option value="operator">Operator</option>
                  <option value="staff">Staff</option><option value="worker">Worker</option>
                  <option value="admin">Admin</option><option value="sysadmin">SysAdmin</option>
                  <optgroup label="Hostel">
                    <option value="caretaker">Caretaker</option>
                    <option value="deputy_warden">Deputy Warden</option>
                    <option value="hostel_manager">Hostel Manager</option>
                  </optgroup>
                  <optgroup label="Academic">
                    <option value="principal">Principal</option>
                    <option value="vice_principal">Vice Principal</option>
                    <option value="oie">OIE</option>
                    <option value="exam_branch">Exam Branch</option>
                  </optgroup>
                </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Department</label>
                    <input type="text" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Designation</label>
                  <input type="text" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:" />
                </div>
            {["caretaker", "deputy_warden", "hostel_manager", "warden"].includes(editForm.role) && (
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1" htmlFor="hostel-scope">Hostel Scope</label>
                <input id="hostel-scope"
                  type="text"
                  placeholder="e.g. MH-1, LH-2, or ALL"
                  value={editForm.hostelScope}
                  onChange={(e) => setEditForm({ ...editForm, hostelScope: e.target.value })}
                  className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:"
                />
              </div>
            )}
                <div className="surface-card grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-bg-elevated/60">
                  <div>
                    <label className="text-xs font-semibold text-action-warning block mb-1">Reset Password (Optional)</label>
                    <input type="password" placeholder="New Auth Password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-surface text-xs text-text-primary focus:outline-none focus:" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-action-warning block mb-1">Reset Kiosk PIN (Optional)</label>
                    <input type="text" placeholder="4-8 digit PIN" value={editForm.newPin} onChange={(e) => setEditForm({ ...editForm, newPin: e.target.value })} className="surface-card w-full min-h11 px-3 py-2 bg-bg-surface text-xs text-text-primary focus:outline-none focus:" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={4} value={editForm.customMetaJson} onChange={(e) => setEditForm({ ...editForm, customMetaJson: e.target.value })} className="surface-card w-full px-3 py-2 bg-bg-elevated text-xs font-mono text-text-secondary focus:outline-none focus:" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingStaff(null)} className="surface-card px-4 py-2 min-h11 bg-bg-elevated text-text-secondary text-xs font-semibold hover:bg-bg-elevated">Cancel</button>
                  <button type="submit" disabled={busy} className="surface-card px-4 py-2 min-h11 bg-action-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">{busy ? "Saving..." : "Update Staff"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

