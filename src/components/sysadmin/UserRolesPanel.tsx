"use client";
import { useEffect, useState } from "react";
import { Plus, X, Shield } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

const ALL_ROLES = [
  "operator","admin","sysadmin","supervisor","guardian","parent","hod","student",
  "warden","faculty","staff","worker","visitor","caretaker","deputy_warden",
  "hostel_manager","principal","vice_principal","oie","exam_branch",
];

export function UserRolesPanel({ userId }: { userId: string }) {
  const [roles, setRoles] = useState<{ role: string; scope: string | null }[]>([]);
  const [newRole, setNewRole] = useState("");
  const [newScope, setNewScope] = useState("");

  const load = async () => {
    const res = await fetch(`/api/admin/users/${userId}/roles`, { headers: getAuthHeaders() });
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
  };
  useEffect(() => { load(); }, [userId]);

  const grant = async () => {
    if (!newRole) return;
    await fetch(`/api/admin/users/${userId}/roles`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant", role: newRole, scope: newScope || undefined }),
    });
    setNewRole(""); setNewScope(""); load();
  };

  const revoke = async (role: string, scope: string | null) => {
    await fetch(`/api/admin/users/${userId}/roles`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", role, scope: scope || undefined }),
    });
    load();
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> Roles ({roles.length})
      </label>

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <span
            key={`${r.role}:${r.scope ?? ""}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)]"
          >
            <span className="font-mono">{r.role}</span>
            {r.scope && <span className="text-[10px] text-[var(--text-muted)]">· {r.scope}</span>}
            <button onClick={() => revoke(r.role, r.scope)} className="text-rose-400 hover:text-rose-300">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={newRole} onChange={(e) => setNewRole(e.target.value)}
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs"
        >
          <option value="">Add role…</option>
          {ALL_ROLES.filter(r => !roles.some(x => x.role === r && !x.scope)).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          value={newScope} onChange={(e) => setNewScope(e.target.value)}
          placeholder="scope (optional)"
          className="w-32 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs"
        />
        <button
          onClick={grant} disabled={!newRole}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}