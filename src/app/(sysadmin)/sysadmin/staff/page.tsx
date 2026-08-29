"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  Briefcase, Search, RefreshCw, UserPlus, Edit, Trash2,
  Ban, CheckCircle2, X, Mail, ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
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
  metadata?: Record<string, any>;
}

export default function SysAdminStaffPage() {
  const { addToast } = useUIStore();
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    employeeId: "", name: "", email: "", phone: "",
    role: "faculty", department: "CSE", designation: "Assistant Professor", customMetaJson: "{}",
  });

  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", role: "faculty",
    department: "", designation: "", customMetaJson: "{}",
    newPassword: "", newPin: "",
  });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setStaffList(json.data.filter((u: any) => u.role !== "student" && u.role !== "parent"));
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to load staff" });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error loading staff" });
    } finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { loadStaff(); }, [loadStaff]);


  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employeeId.trim() || !createForm.name.trim()) {
      addToast({ variant: "error", title: "Validation", message: "Employee ID and name are required." });
      return;
    }
    setBusy(true);
    try {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(createForm.customMetaJson || "{}"); } catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Custom metadata must be valid JSON." });
        setBusy(false); return;
      }
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: createForm.employeeId, fullName: createForm.name,
          personType: createForm.role, email: createForm.email || undefined,
          phone: createForm.phone || undefined, department: createForm.department || undefined,
          designation: createForm.designation || undefined, metadata: parsedMeta,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({ variant: "success", title: "Created", message: `${createForm.name} added.` });
        setShowCreateModal(false);
        setCreateForm({ employeeId: "", name: "", email: "", phone: "", role: "faculty", department: "CSE", designation: "Assistant Professor", customMetaJson: "{}" });
        loadStaff();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to create." });
      }
    } catch { addToast({ variant: "error", title: "Error", message: "Network error." }); }
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
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name, email: editForm.email || undefined,
          phone: editForm.phone || undefined, role: editForm.role,
          department: editForm.department || undefined,
          designation: editForm.designation || undefined, metadata: parsedMeta,
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
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
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
      const res = await fetch(`/api/users/${s.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) { addToast({ variant: "success", title: "Deleted", message: `${s.name} removed.` }); loadStaff(); }
    } catch { addToast({ variant: "error", title: "Error", message: "Could not delete." }); }
  };

  const openEditModal = (s: StaffRecord) => {
    setEditingStaff(s);
    setEditForm({
      name: s.name, email: s.email, phone: s.phone || "", role: s.role,
      department: s.department || "", designation: s.designation || "",
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
      sysadmin: "bg-exit-subtle border-red-500/30",
      admin: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      faculty: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      operator: "bg-entry-subtle border-emerald-500/30",
      staff: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]",
      worker: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    };
    return c[role] || "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]";
  };

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
              <Briefcase className="w-7 h-7 text-[var(--action-primary)]" />
              Staff &amp; Non-Students Management
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Manage faculty, operators, admins, and all non-student personnel. {staffList.length} records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadStaff()} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)]/50" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 shadow-lg shadow-emerald-900/30">
              <UserPlus className="w-4 h-4" /> Add Staff
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search by name, ID, email..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--action-primary)]" />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)]">
              <option value="ALL">All Roles</option>
              <option value="sysadmin">SysAdmin</option><option value="admin">Admin</option>
              <option value="faculty">Faculty</option><option value="operator">Operator</option>
              <option value="staff">Staff</option><option value="worker">Worker</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)]">
              <option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>


        {/* Table */}
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[var(--bg-elevated)]/60 text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                ) : filteredStaff.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">No staff members found.</td></tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--action-primary)]">{s.uniqueId || "—"}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{s.name}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs"><Mail className="w-3 h-3 inline mr-1" />{s.email}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadge(s.role)}`}><ShieldCheck className="w-3 h-3" />{s.role}</span></td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{s.department || "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === "ACTIVE" ? "bg-entry-subtle" : "bg-exit-subtle"}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--action-info)]" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleToggleStatus(s)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)]" title={s.status === "ACTIVE" ? "Suspend" : "Activate"}>{s.status === "ACTIVE" ? <Ban className="w-3.5 h-3.5 text-[var(--action-warning)]" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[var(--action-primary)]" />}</button>
                          <button onClick={() => handleDeleteStaff(s)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--action-danger)]" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Add New Staff</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateStaff} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Employee ID *</label>
                    <input type="text" required value={createForm.employeeId} onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" placeholder="EMP-001" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Full Name *</label>
                    <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Email</label>
                    <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Phone</label>
                    <input type="text" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Role</label>
                    <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]">
                      <option value="faculty">Faculty</option><option value="operator">Operator</option>
                      <option value="staff">Staff</option><option value="worker">Worker</option>
                      <option value="admin">Admin</option><option value="sysadmin">SysAdmin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Department</label>
                    <input type="text" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Designation</label>
                    <input type="text" value={createForm.designation} onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={3} value={createForm.customMetaJson} onChange={(e) => setCreateForm({ ...createForm, customMetaJson: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-xs font-mono text-[var(--text-secondary)] focus:outline-none focus:border-[var(--action-primary)]" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-elevated)]">Cancel</button>
                  <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Creating..." : "Create Staff"}</button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Edit Modal */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Edit Staff — {editingStaff.uniqueId || editingStaff.id}</h2>
                <button onClick={() => setEditingStaff(null)} className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleEditStaff} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Full Name</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Phone</label>
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Role</label>
                    <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]">
                      <option value="faculty">Faculty</option><option value="operator">Operator</option>
                      <option value="staff">Staff</option><option value="worker">Worker</option>
                      <option value="admin">Admin</option><option value="sysadmin">SysAdmin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Department</label>
                    <input type="text" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Designation</label>
                  <input type="text" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]" />
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-elevated)]/60 border border-[var(--border-strong)] rounded-xl">
                  <div>
                    <label className="text-xs font-semibold text-amber-400 block mb-1">Reset Password (Optional)</label>
                    <input type="password" placeholder="New Auth Password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-amber-400 block mb-1">Reset Kiosk PIN (Optional)</label>
                    <input type="text" placeholder="4-8 digit PIN" value={editForm.newPin} onChange={(e) => setEditForm({ ...editForm, newPin: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={4} value={editForm.customMetaJson} onChange={(e) => setEditForm({ ...editForm, customMetaJson: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-xs font-mono text-[var(--text-secondary)] focus:outline-none focus:border-[var(--action-primary)]" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingStaff(null)} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-elevated)]">Cancel</button>
                  <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Saving..." : "Update Staff"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

