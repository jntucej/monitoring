"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { HodIdInput } from "@/components/sysadmin/HodIdInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Building2, Plus, Trash2, Edit3, CheckCircle2, ShieldAlert, Users, GraduationCap } from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface Department {
  code: string;
  name: string;
  hod: string;
  totalStudents: number;
  facultyCount: number;
  heatmap?: { y1: number; y2: number; y3: number; y4: number; le: number };
}

export default function DepartmentsManagementPage() {
const api = useApi();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<Partial<Department> & { hodIdInput: string; hodUserId: string | null } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/departments?t=${Date.now()}`, { headers: api.getHeaders() });
      const json = await res.json();
      if (json.success) setDepartments(json.data || []);
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load departments" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept?.code || !editingDept?.name || !editingDept.hodUserId) return;

    const { hodIdInput, hodUserId, ...dept } = editingDept;
    const payload = { ...dept, hodUserId } as Record<string, unknown>;
    if (payload.hod === undefined) payload.hod = "Not Assigned";

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Saved department ${editingDept.code}` });
        setEditingDept(null);
        fetchDepts();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to save department" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error saving department" });
    }
  };

  const handleDelete = (code: string) => setDeptToDelete(code);

  const confirmDelete = async () => {
    if (!deptToDelete) return;
    try {
      const res = await fetch(`/api/departments?code=${deptToDelete}`, {
        method: "DELETE",
        headers: api.getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Deleted department ${deptToDelete}` });
        fetchDepts();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to delete department" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error deleting department" });
    } finally {
      setDeptToDelete(null);
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              Department & HOD Governance Desk
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Manage academic departments, student/faculty allocation, and HOD assignments
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingDept({
                code: "",
                name: "",
                hod: "Not Assigned",
                hodIdInput: "",
                hodUserId: null,
              })
            }
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {statusMsg.text}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm animate-pulse">
              Loading department telemetry…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[650px]">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-xs">
                  <tr>
                    <th className="p-4">Dept Code</th>
                    <th className="p-4">Department Name</th>
                    <th className="p-4">Assigned HOD</th>
                    <th className="p-4">Student Roster</th>
                    <th className="p-4">Faculty Count</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {departments.map((d) => (
                    <tr key={d.code} className="hover:bg-[var(--bg-elevated)]/50 transition">
                      <td className="p-4 font-mono font-bold text-emerald-400">{d.code}</td>
                      <td className="p-4 font-semibold text-[var(--text-primary)]">{d.name}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            d.hod !== "Not Assigned"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {d.hod}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--text-primary)]">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                          <span>{d.totalStudents} Students</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--text-primary)]">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span>{d.facultyCount} Faculty</span>
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDept({ ...d, hodIdInput: "", hodUserId: null })
                          }
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-emerald-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
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
        {editingDept && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingDept.code ? "Edit Department" : "Create New Department"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Department Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDept.code || ""}
                    onChange={(e) => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CSE"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDept.name || ""}
                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Head of Department
                  </label>
                  <div className="mt-1">
                    <HodIdInput
                      value={editingDept.hodIdInput || ""}
                      onChange={(v) => setEditingDept({ ...editingDept!, hodIdInput: v })}
                      onResolved={(id) => setEditingDept({ ...editingDept!, hodUserId: id })}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Enter any official identifier: student roll · employee ID · unique ID · email.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingDept(null)}
                    className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-xl text-xs font-semibold hover:bg-[var(--border)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editingDept.code || !editingDept.name || !editingDept.hodUserId}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Save Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deptToDelete}
          onClose={() => setDeptToDelete(null)}
          title="Delete department?"
          body={`Delete department "${deptToDelete ?? ""}"? This is audited.`}
          confirmText="Delete"
          variant="destructive"
          onConfirm={confirmDelete}
        />
      </div>
    </AuthGuard>
  );
}
