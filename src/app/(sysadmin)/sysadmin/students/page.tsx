"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  GraduationCap, Search, RefreshCw, UserPlus, Edit, Trash2,
  Ban, CheckCircle2, X, Upload, Phone, Mail, Home, SlidersHorizontal,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { BulkUserImportModal } from "@/components/sysadmin/BulkUserImportModal";

interface StudentRecord {
  id: string;
  uniqueId?: string;
  roll?: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  year?: number | string;
  status: "ACTIVE" | "SUSPENDED" | string;
  hostelRoom?: string;
  isHosteller?: boolean;
  metadata?: Record<string, any>;
  studentDetails?: {
    roll?: string;
    departmentId?: string;
    guardianName?: string;
    guardianPhone?: string;
    hostelRoom?: string;
    isHosteller?: boolean;
  };
}

export default function SysAdminStudentsPage() {
  const { addToast } = useUIStore();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    roll: "", name: "", email: "", phone: "", branch: "CSE",
    hostelRoom: "", isHosteller: false, customMetaJson: "{}",
  });

  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", branch: "",
    hostelRoom: "", isHosteller: false, customMetaJson: "{}",
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setStudents(json.data);
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to load student roster" });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error loading students" });
    } finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.roll.trim() || !createForm.name.trim()) {
      addToast({ variant: "error", title: "Validation", message: "Roll and name are required." });
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
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: createForm.roll, name: createForm.name, role: "student",
          email: createForm.email || undefined, phone: createForm.phone || undefined,
          department: createForm.branch || undefined,
          metadata: { ...parsedMeta, hostelRoom: createForm.hostelRoom, isHosteller: createForm.isHosteller },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({ variant: "success", title: "Created", message: `Student ${createForm.name} added.` });
        setShowCreateModal(false);
        setCreateForm({ roll: "", name: "", email: "", phone: "", branch: "CSE", hostelRoom: "", isHosteller: false, customMetaJson: "{}" });
        loadStudents();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to create student." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error creating student." });
    } finally { setBusy(false); }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setBusy(true);
    try {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(editForm.customMetaJson || "{}"); } catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Custom metadata must be valid JSON." });
        setBusy(false); return;
      }
      const res = await fetch(`/api/users/${editingStudent.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || undefined, email: editForm.email || undefined,
          phone: editForm.phone || undefined, department: editForm.branch || undefined,
          metadata: { ...parsedMeta, hostelRoom: editForm.hostelRoom, isHosteller: editForm.isHosteller },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({ variant: "success", title: "Updated", message: `Student updated.` });
        setEditingStudent(null);
        loadStudents();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to update." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error updating student." });
    } finally { setBusy(false); }
  };

  const handleToggleStatus = async (s: StudentRecord) => {
    const newStatus = s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Set ${s.name} to ${newStatus}?`)) return;
    try {
      const res = await fetch(`/api/users/${s.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        addToast({ variant: "success", title: "Status Updated", message: `${s.name} is now ${newStatus}.` });
        loadStudents();
      } else {
        const json = await res.json();
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to update status." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error." });
    }
  };

  const handleDeleteStudent = async (s: StudentRecord) => {
    if (!confirm(`Delete student ${s.name} (${s.roll || s.uniqueId})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users/${s.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        addToast({ variant: "success", title: "Deleted", message: `${s.name} removed.` });
        loadStudents();
      } else {
        const json = await res.json();
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to delete." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error." });
    }
  };

  const openEditModal = (s: StudentRecord) => {
    setEditingStudent(s);
    setEditForm({
      name: s.name, email: s.email || "", phone: s.phone || "",
      branch: s.department || "", hostelRoom: s.hostelRoom || s.studentDetails?.hostelRoom || "",
      isHosteller: s.isHosteller ?? s.studentDetails?.isHosteller ?? false,
      customMetaJson: JSON.stringify(s.metadata || {}, null, 2),
    });
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || s.name?.toLowerCase().includes(q) || s.roll?.toLowerCase().includes(q) ||
        s.uniqueId?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
      const matchesBranch = branchFilter === "ALL" || s.department === branchFilter;
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [students, search, branchFilter, statusFilter]);

  const branches = useMemo(() => {
    const set = new Set(students.map((s) => s.department).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);


  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-emerald-400" />
              Student Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">Manage student roster. {students.length} records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadStudents()} className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 shadow-lg shadow-emerald-900/30">
              <UserPlus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search by name, roll, email..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1220] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-[#0d1220] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#0d1220] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>


        {/* Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0d1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Roll No</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No students found.</td></tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-400">{s.roll || s.uniqueId || "—"}</td>
                      <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{s.department || "—"}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{s.year || "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleToggleStatus(s)} className="p-1.5 rounded-lg hover:bg-slate-700" title={s.status === "ACTIVE" ? "Suspend" : "Activate"}>{s.status === "ACTIVE" ? <Ban className="w-3.5 h-3.5 text-amber-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}</button>
                          <button onClick={() => handleDeleteStudent(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Add New Student</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateStudent} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Roll Number *</label>
                    <input type="text" required value={createForm.roll} onChange={(e) => setCreateForm({ ...createForm, roll: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="22CS101" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name *</label>
                    <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                    <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Phone</label>
                    <input type="text" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Branch</label>
                    <input type="text" value={createForm.branch} onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Hostel Room</label>
                    <input type="text" value={createForm.hostelRoom} onChange={(e) => setCreateForm({ ...createForm, hostelRoom: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={createForm.isHosteller} onChange={(e) => setCreateForm({ ...createForm, isHosteller: e.target.checked })} className="rounded border-slate-600" />
                  <Home className="w-3.5 h-3.5" /> Hosteller
                </label>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={3} value={createForm.customMetaJson} onChange={(e) => setCreateForm({ ...createForm, customMetaJson: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Creating..." : "Create Student"}</button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Edit Modal */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Edit Student — {editingStudent.roll || editingStudent.uniqueId}</h2>
                <button onClick={() => setEditingStudent(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleEditStudent} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Phone</label>
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Branch</label>
                    <input type="text" value={editForm.branch} onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Hostel Room</label>
                    <input type="text" value={editForm.hostelRoom} onChange={(e) => setEditForm({ ...editForm, hostelRoom: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={editForm.isHosteller} onChange={(e) => setEditForm({ ...editForm, isHosteller: e.target.checked })} className="rounded border-slate-600" />
                  <Home className="w-3.5 h-3.5" /> Hosteller
                </label>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={4} value={editForm.customMetaJson} onChange={(e) => setEditForm({ ...editForm, customMetaJson: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Saving..." : "Update Student"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <BulkUserImportModal onClose={() => setShowBulkModal(false)} onSuccess={() => { setShowBulkModal(false); loadStudents(); }} />
        )}
      </div>
    </AuthGuard>
  );
}

