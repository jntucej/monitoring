"use client";

import { useState, useMemo, useCallback } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  GraduationCap, Search, RefreshCw, UserPlus, Edit, Trash2,
  Ban, CheckCircle2, X, Upload, Phone, Mail, Home, SlidersHorizontal,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
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
  createdAt?: string;
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    roll: "", name: "", email: "", phone: "", branch: "CSE",
    hostelRoom: "", isHosteller: false, customMetaJson: "{}",
  });

  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", branch: "",
    hostelRoom: "", isHosteller: false, customMetaJson: "{}",
    newPassword: "", newPin: "",
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Force cache: 'no-store' is already here, but let's add a timestamp to ensure zero caching
      const res = await fetch(`/api/students?t=${Date.now()}`, { 
        headers: getAuthHeaders(), 
        cache: "no-store",
        next: { revalidate: 0 } 
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setStudents(json.data);
      } else {
        // If data is empty but res is ok, trigger a one-time automatic retry to bypass transient cache
        if (Array.isArray(json.data) && json.data.length === 0) {
           console.warn("API returned empty data, attempting one-time quiet retry...");
           const retryRes = await fetch(`/api/students?t=${Date.now()}&retry=1`, { headers: getAuthHeaders(), cache: "no-store" });
           const retryJson = await retryRes.json().catch(() => ({}));
           if (retryRes.ok && retryJson.success && Array.isArray(retryJson.data)) {
              setStudents(retryJson.data);
              return;
           }
        }
        const msg = json.error?.message || `Failed to load student roster (HTTP ${res.status})`;
        setLoadError(msg);
        addToast({ variant: "error", title: "Error", message: msg });
      }
    } catch {
      const msg = "Network error loading students";
      setLoadError(msg);
      addToast({ variant: "error", title: "Error", message: msg });
    } finally { setLoading(false); }
  }, [addToast]);

  // Live toggle drives refetch; polls every 30s while Live.
  useLiveRefresh(loadStudents, { intervalMs: 30000 });

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
      const studentEmail = createForm.email.trim() || `${createForm.roll.trim().toLowerCase()}@jntuhcej.ac.in`;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: createForm.roll, name: createForm.name, role: "student",
          email: studentEmail, phone: createForm.phone || undefined,
          department: createForm.branch || undefined,
          departmentId: createForm.branch || undefined,
          hostelRoom: createForm.hostelRoom || undefined,
          isHosteller: createForm.isHosteller,
          metadata: { ...parsedMeta, hostelRoom: createForm.hostelRoom, isHosteller: createForm.isHosteller },
        }),
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success) {
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
      const targetEndpoint = (editingStudent.roll || editingStudent.uniqueId)
        ? `/api/students/${encodeURIComponent(editingStudent.roll || editingStudent.uniqueId || "")}`
        : `/api/users/${editingStudent.id}`;
      const res = await fetch(targetEndpoint, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || undefined, email: editForm.email || undefined,
          phone: editForm.phone || undefined, department: editForm.branch || undefined,
          hostelRoom: editForm.hostelRoom || undefined, isHosteller: editForm.isHosteller,
          password: editForm.newPassword || undefined,
          pin: editForm.newPin || undefined,
          metadata: { ...parsedMeta, hostelRoom: editForm.hostelRoom, isHosteller: editForm.isHosteller },
        }),
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success !== false) {
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

  const STATUS_OPTIONS = [
    { value: "ACTIVE",        label: "Active" },
    { value: "LOCKED",        label: "Locked" },
    { value: "SUSPENDED",     label: "Suspended" },
    { value: "DISABLED",      label: "Disabled" },
    { value: "DEPROVISIONED", label: "Deprovisioned" },
  ] as const;

  const handleSetStatus = async (s: StudentRecord, newStatus: string) => {
    // Destructive transitions require a reason
    let reason = "";
    if (newStatus === "DEPROVISIONED" || newStatus === "DISABLED") {
      reason = window.prompt(`Reason for setting ${newStatus}?`) ?? "";
      if (reason.trim().length < 5) {
        addToast({ variant: "warning", message: "Reason required (min 5 chars)" });
        return;
      }
    }

    try {
      const targetEndpoint = (s.roll || s.uniqueId)
        ? `/api/students/${encodeURIComponent(s.roll || s.uniqueId || "")}`
        : `/api/users/${s.id}`;
      const res = await fetch(targetEndpoint, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (res.ok) {
        addToast({ variant: "success", title: "Status Updated", message: `${s.name} is now ${newStatus}.` });
        loadStudents();
      } else {
        const json = await res.json().catch(() => ({}));
        addToast({ variant: "error", title: "Error", message: json.error?.message ?? "Failed to update status." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error." });
    }
  };

  const handleDeleteStudent = async (s: StudentRecord) => {
    if (!confirm(`Delete student ${s.name} (${s.roll || s.uniqueId})? This cannot be undone.`)) return;
    try {
      const targetEndpoint = (s.roll || s.uniqueId)
        ? `/api/students/${encodeURIComponent(s.roll || s.uniqueId || "")}`
        : `/api/users/${s.id}`;
      const res = await fetch(targetEndpoint, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      
      if (res.ok) {
        addToast({
          variant: "success",
          message: data.mode === "soft_delete"
            ? data.message ?? "Account deactivated (history preserved)"
            : "Student permanently deleted",
        });
        loadStudents();
      } else {
        addToast({ variant: "error", title: "Error", message: data.error ?? "Failed to delete." });
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
      newPassword: "", newPin: "",
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

  // ponytail: newest 5 by createdAt — needs /api/students to return createdAt
  const recentStudents = useMemo(() => {
    return [...students]
      .filter((s) => s.createdAt)
      .sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1))
      .slice(0, 5);
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


        {loadError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-800/60 bg-red-950/40 text-sm text-red-300">
            <span><strong className="font-semibold">Failed to load roster:</strong> {loadError}</span>
            <button onClick={() => loadStudents()} className="px-3 py-1.5 rounded-lg bg-red-900/60 text-red-100 text-xs font-semibold hover:bg-red-800 whitespace-nowrap">Retry</button>
          </div>
        )}

        {/* Recently added — quick access to edit the newest students */}
        {recentStudents.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Recently Added
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-[#0d1220] border border-emerald-900/50">
                  <div className="text-xs">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span className="ml-2 font-mono text-emerald-400">{s.roll || s.uniqueId}</span>
                  </div>
                  <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title={`Edit ${s.name}`}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No students found.
                      {students.length === 0 && !search && !loadError && (
                        <div className="mt-2 text-xs text-slate-600 max-w-md mx-auto">
                          No active students found in the database.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-400">{s.roll || s.uniqueId || "—"}</td>
                      <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{s.department || "—"}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{s.year || "—"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={(e) => handleSetStatus(s, e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
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
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <div>
                    <label className="text-xs font-semibold text-amber-400 block mb-1">Reset Password (Optional)</label>
                    <input type="password" placeholder="New Auth Password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-amber-400 block mb-1">Reset Kiosk PIN (Optional)</label>
                    <input type="text" placeholder="4-8 digit PIN" value={editForm.newPin} onChange={(e) => setEditForm({ ...editForm, newPin: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400" />
                  </div>
                </div>
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

