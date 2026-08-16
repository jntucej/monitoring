"use client";
import { useEffect, useState } from "react";
import { UserPlus, User, Loader2, XCircle } from "lucide-react";
import type { User as UserType } from "@/lib/types";

export function UserManagement() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "supervisor" | "operator" | "parent" | "student">("operator");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, isActive: true }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ User added.");
        setName("");
        setEmail("");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to add user"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (user: UserType) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // No fields to update for now
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ User updated.");
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to update user"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="font-semibold">User Management</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-4 bg-[var(--bg-base)] rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            >
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="operator">Operator</option>
              <option value="parent">Parent</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add User"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load users</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          No users configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {user.email} • {user.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleActive(user)}
                  className="text-sm font-medium px-3 py-1 rounded-full bg-gray-500/10 text-gray-400"
                >
                  Status
                </button>
                <button className="text-sm font-medium text-sky-400 hover:underline">Edit</button>
                <button className="text-sm font-medium text-rose-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
