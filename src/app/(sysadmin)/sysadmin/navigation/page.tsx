"use client";


import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Layout, Plus, Trash2, Edit3, CheckCircle2, ShieldAlert, Layers } from "lucide-react";
import { useApi } from "@/hooks/useApi";

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
const api = useApi();

  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("sysadmin");
  const [editingItem, setEditingItem] = useState<Partial<NavItem> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [navToDelete, setNavToDelete] = useState<string | null>(null);

  const fetchNav = async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/config/navigation?role=${role}`, { headers: api.getHeaders() });
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
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
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

  const handleDelete = (id: string) => setNavToDelete(id);

  const confirmDeleteNav = async () => {
    if (!navToDelete) return;
    try {
      const res = await fetch(`/api/config/navigation?id=${navToDelete}`, {
        method: "DELETE",
        headers: api.getHeaders(),
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
    } finally {
      setNavToDelete(null);
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Layout className="w-6 h-6 text-blue-400" />
              Dynamic Sidebar Navigation Editor
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Customize sidebar links, labels, group headers, and icons dynamically per role
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingItem({
                roleCode: selectedRole,
                groupLabel: "Menu",
                href: "/",
                label: "",
                icon: "FileText",
                order: navItems.length + 1,
              })
            }
            className="px-4 py-2 min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Nav Item
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

        {/* Role tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["sysadmin", "admin", "principal", "warden", "operator", "faculty", "student", "parent"].map((role) => (
            <button
              type="button"
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                selectedRole === role
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm animate-pulse">
              Loading navigation manifest for {selectedRole}…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-xs">
                  <tr>
                    <th className="p-4">Order</th>
                    <th className="p-4">Group Header</th>
                    <th className="p-4">Link Label</th>
                    <th className="p-4">Target Href</th>
                    <th className="p-4">Icon</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {navItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-elevated)]/50 transition">
                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{item.order}</td>
                      <td className="p-4 font-medium text-[var(--text-muted)]">{item.groupLabel}</td>
                      <td className="p-4 font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" />
                        {item.label}
                      </td>
                      <td className="p-4 font-mono text-xs text-blue-400">{item.href}</td>
                      <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{item.icon}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:text-blue-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => item.id && handleDelete(item.id)}
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

        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingItem.id ? "Edit Nav Item" : "New Nav Item"} ({selectedRole})
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Group Label
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.groupLabel || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, groupLabel: e.target.value })}
                    placeholder="e.g. Monitoring"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Link Label
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.label || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                    placeholder="e.g. Live Gates"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Target Href
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.href || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
                    placeholder="e.g. /sysadmin/gates"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Lucide Icon Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.icon || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                      placeholder="e.g. DoorOpen"
                      className="w-full min-h-[44px] px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      required
                      value={editingItem.order ?? 1}
                      onChange={(e) => setEditingItem({ ...editingItem, order: Number(e.target.value) })}
                      className="w-full min-h-[44px] px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 min-h-[44px] bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-xl text-xs font-semibold hover:bg-[var(--border)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 min-h-[44px] bg-blue-500 text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!navToDelete}
          onClose={() => setNavToDelete(null)}
          title="Delete navigation item?"
          body="Delete this navigation item? This is audited."
          confirmText="Delete"
          variant="destructive"
          onConfirm={confirmDeleteNav}
        />
      </div>
    </AuthGuard>
  );
}
