"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { UserCog, Plus, ShieldCheck, Edit3, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface SystemRole {
  code: string;
  display_name: string;
  description: string;
  icon_name: string;
  default_redirect: string;
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Partial<SystemRole> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/roles", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) setRoles(json.data || []);
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load system roles" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
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
        setStatusMsg({ type: "success", text: `Saved role ${editingRole.code}` });
        setEditingRole(null);
        fetchRoles();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to save role" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error saving role" });
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to deactivate role '${code}'?`)) return;
    try {
      const res = await fetch(`/api/config/roles?code=${code}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Deactivated role ${code}` });
        fetchRoles();
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to deactivate role" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error deactivating role" });
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserCog className="w-6 h-6 text-purple-400" />
              Roles & Authorization Policies
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage system role definitions, icons, and default landing route redirects
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
                        <div className="text-xs text-[var(--text-muted)]">{r.description || "No description"}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{r.icon_name}</td>
                      <td className="p-4 font-mono text-xs text-emerald-400">{r.default_redirect}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingRole(r)}
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-purple-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.code)}
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
                    onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value.toLowerCase() })}
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
                    onChange={(e) => setEditingRole({ ...editingRole, display_name: e.target.value })}
                    placeholder="e.g. Gate Supervisor"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingRole.description || ""}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    placeholder="Scope of authority..."
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
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
                      onChange={(e) => setEditingRole({ ...editingRole, icon_name: e.target.value })}
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
                      onChange={(e) => setEditingRole({ ...editingRole, default_redirect: e.target.value })}
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
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}