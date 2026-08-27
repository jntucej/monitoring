"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Layout, Plus, Trash2, Edit3, CheckCircle2, ShieldAlert, Layers } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface NavItem {
  id?: string;
  roleCode: string;
  groupLabel: string;
  href: string;
  label: string;
  icon: string;
  badge?: string | null;
  order: number;
}

export default function NavigationEditorPage() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("sysadmin");
  const [editingItem, setEditingItem] = useState<Partial<NavItem> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchNav = async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/config/navigation?role=${role}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        const flat: NavItem[] = json.raw || [];
        setNavItems(flat);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load navigation configuration" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNav(selectedRole);
  }, [selectedRole]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.href || !editingItem?.label) return;

    try {
      const res = await fetch("/api/config/navigation", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingItem, roleCode: selectedRole }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: `Saved navigation item '${editingItem.label}'` });
        setEditingItem(null);
        fetchNav(selectedRole);
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to save navigation item" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error saving navigation item" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this navigation item?")) return;
    try {
      const res = await fetch(`/api/config/navigation?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: "success", text: "Deleted navigation item" });
        fetchNav(selectedRole);
      } else {
        setStatusMsg({ type: "error", text: json.error?.message || "Failed to delete" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error deleting nav item" });
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Layout className="w-6 h-6 text-blue-400" />
              Dynamic Sidebar Navigation Editor
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Customize sidebar links, labels, group headers, and icons dynamically per role
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]"
            >
              <option value="sysadmin">Role: System Admin</option>
              <option value="admin">Role: Campus Admin</option>
              <option value="operator">Role: Gate Operator</option>
              <option value="student">Role: Student</option>
              <option value="guardian">Role: Guardian</option>
            </select>
            <button
              onClick={() =>
                setEditingItem({
                  roleCode: selectedRole,
                  groupLabel: "General",
                  href: "",
                  label: "",
                  icon: "Link",
                  order: navItems.length + 1,
                })
              }
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Add Nav Item
            </button>
          </div>
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
              Loading navigation configuration for {selectedRole}…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-xs">
                  <tr>
                    <th className="p-4">Order</th>
                    <th className="p-4">Group Header</th>
                    <th className="p-4">Label</th>
                    <th className="p-4">Href Route</th>
                    <th className="p-4">Icon Token</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {navItems.map((item) => (
                    <tr key={item.id || item.href} className="hover:bg-[var(--bg-elevated)]/50 transition">
                      <td className="p-4 font-mono font-bold text-blue-400">{item.order}</td>
                      <td className="p-4 font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> {item.groupLabel}
                      </td>
                      <td className="p-4 font-semibold text-[var(--text-primary)]">{item.label}</td>
                      <td className="p-4 font-mono text-xs text-emerald-400">{item.href}</td>
                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{item.icon}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-blue-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {item.id && (
                          <button
                            onClick={() => handleDelete(item.id!)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {navItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                        No active custom navigation items for role '{selectedRole}'. Standard code defaults active.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingItem.id ? "Edit Nav Item" : `Add Nav Item for ${selectedRole}`}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Group Section Header
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.groupLabel || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, groupLabel: e.target.value })}
                    placeholder="e.g. Operations"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Navigation Label
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.label || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                    placeholder="e.g. System Audit"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Route Href URL
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.href || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
                    placeholder="e.g. /sysadmin/audit"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Lucide Icon Token
                    </label>
                    <input
                      type="text"
                      value={editingItem.icon || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                      placeholder="e.g. Bell"
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Display Order #
                    </label>
                    <input
                      type="number"
                      value={editingItem.order || 1}
                      onChange={(e) => setEditingItem({ ...editingItem, order: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-xl text-xs font-semibold hover:bg-[var(--border)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition"
                  >
                    Save Nav Item
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