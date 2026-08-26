"use client";
import { useEffect, useState } from "react";
import { UserPlus, User, Loader2, XCircle, Fingerprint, ShieldCheck } from "lucide-react";
import type { User as UserType } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";

export function UserManagement() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [gates, setGates] = useState<Array<{ id: string; name: string }>>([]);
  const [gateId, setGateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "supervisor" | "operator" | "parent" | "student">("operator");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /** Auth headers required by every /api route (withAuthorization). */
  const authHeaders = (): Record<string, string> => {
    const auth = useAuthStore.getState();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (auth.token) h["Authorization"] = `Bearer ${auth.token}`;
    if (auth.user?.currentSessionToken) h["X-Session-Token"] = auth.user.currentSessionToken;
    return h;
  };

  const patchUser = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    return { ok: res.ok, json: await res.json().catch(() => null) };
  };

  /** Register a (mock-captured) thumbprint for a user via the admin route. */
  const registerThumbprint = async (user: UserType) => {
    setBusy(true);
    setMsg(null);
    try {
      // MOCK capture — PREFIX must match the operator scanner's `sig:${userId}`.
      // Replace with the real biometric scanner SDK here.
      const signature = `sig:${user.id}`;
      const res = await fetch("/api/operator/register-thumbprint", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, signature }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg(`✅ Thumbprint registered for ${user.name}.`);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to register thumbprint"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  /** Remove a user's stored thumbprint. */
  const clearThumbprint = async (user: UserType) => {
    if (!confirm(`Clear thumbprint for ${user.name}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/operator/register-thumbprint", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, clear: true }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg(`✅ Thumbprint cleared for ${user.name}.`);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to clear thumbprint"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users", { cache: "no-store", headers: authHeaders() });
      const json = await res.json();
      if (json.success) setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadGates = async () => {
    try {
      const res = await fetch("/api/gates", { cache: "no-store" });
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) setGates(json.data);
    } catch { /* gate list is optional */ }
  };

  useEffect(() => {
    load();
    loadGates();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name, email, role, gateId: role === "operator" ? gateId || undefined : undefined, isActive: true }),
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

  const changeRole = async (user: UserType, newRole: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const { ok, json } = await patchUser(user.id, { role: newRole });
      if (ok && json?.success) {
        setMsg(`✅ ${user.name} is now a ${newRole}.`);
        load();
      } else {
        setMsg(`❌ ${json?.error?.message ?? "Failed to change role"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  const cycleStatus = async (user: UserType) => {
    const next = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setBusy(true);
    setMsg(null);
    try {
      const { ok, json } = await patchUser(user.id, { status: next });
      if (ok && json?.success) {
        setMsg(`✅ ${user.name} is now ${next}.`);
        load();
      } else {
        setMsg(`❌ ${json?.error?.message ?? "Failed to update status"}`);
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
          {(role === "operator" || role === "supervisor") && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {role === "operator" ? "Assign Gate" : "Primary Gate"}
              </label>
              <select
                value={gateId}
                onChange={(e) => setGateId(e.target.value)}
                className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
              >
                <option value="">— No gate —</option>
                {gates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                {/* Thumbprint (biometric) registration status + actions */}
                {user.thumbprintHash ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Biometric ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/25">
                    No biometric
                  </span>
                )}
                <button
                  onClick={() => registerThumbprint(user)}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 hover:bg-sky-500/20 disabled:opacity-50 flex items-center gap-1"
                >
                  <Fingerprint className="w-3 h-3" />
                  {user.thumbprintHash ? "Re-register" : "Register"}
                </button>
                {user.thumbprintHash && (
                  <button
                    onClick={() => clearThumbprint(user)}
                    disabled={busy}
                    className="text-xs font-medium text-rose-400 hover:underline disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
                <select
                  value={user.role}
                  disabled={busy}
                  onChange={(e) => changeRole(user, e.target.value)}
                  className="text-xs rounded-full bg-sky-500/10 text-sky-300 px-2 py-1 border border-sky-500/20"
                >
                  {["operator", "supervisor", "admin", "student", "parent", "warden"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  onClick={() => cycleStatus(user)}
                  disabled={busy}
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    user.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {user.status}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Deactivate ${user.name}? They will no longer be able to sign in.`)) return;
                    setBusy(true);
                    const { ok, json } = await patchUser(user.id, { status: "DEPROVISIONED" });
                    setMsg(ok && json?.success ? `✅ ${user.name} deactivated.` : `❌ ${json?.error?.message ?? "Failed"}`);
                    setBusy(false);
                    load();
                  }}
                  className="text-sm font-medium text-rose-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
