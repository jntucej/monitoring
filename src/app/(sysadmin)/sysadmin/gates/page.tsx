"use client";

import { useState, useCallback, useEffect } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useUIStore } from "@/stores/uiStore";
import { useApi } from "@/hooks/useApi";
import {
  DoorOpen, Plus, Pencil, Power, Trash2, Search, UserCog,
  Building2, ShieldCheck, X, KeyRound, Monitor,
} from "lucide-react";

interface Gate {
  id: string;
  gate_code?: string;
  gateCode?: string;
  name: string;
  location?: string;
  type?: string;
  audience?: string;
  is_active?: boolean;
}

interface AssignableUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  gateId?: string;
  uniqueId?: string;
  isKioskDefault?: boolean;
}

interface KioskOperator {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  uniqueId?: string;
  gateId?: string | null;
  isKioskDefault?: boolean;
}

const AUDIENCES = [
  { value: "all", label: "All (any audience)" },
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
  { value: "backup", label: "Backup / Overflow" },
];

const GATE_TYPES = [
  { value: "main", label: "Main Campus" },
  { value: "hostel", label: "Hostel" },
  { value: "backup", label: "Backup / Overflow" },
  { value: "system", label: "System / Fallback" },
];

export default function SysAdminGatesPage() {
const api = useApi();

  const { addToast } = useUIStore();

  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Gate | null>(null);
  const [assigningGate, setAssigningGate] = useState<Gate | null>(null);

  const [form, setForm] = useState({ gateCode: "", name: "", location: "", type: "main", audience: "all" });
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AssignableUser[]>([]);

  // Kiosk default operator panel state
  const [kioskOperator, setKioskOperator] = useState<KioskOperator | null>(null);
  const [kioskGate, setKioskGate] = useState<string>("");
  const [kioskBusy, setKioskBusy] = useState(false);

  const loadKioskOperator = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { headers: api.getHeaders(), cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json?.data)) return;
      const operators = json.data.filter(
        (u: KioskOperator) => u.role === "operator" || u.uniqueId?.toUpperCase() === "OPERATOR"
      );
      // Find the explicitly-flagged kiosk default first; fall back to 'OPERATOR'
      const flagged = operators.find((u: KioskOperator) => u.isKioskDefault);
      const fallback = operators.find((u: KioskOperator) => u.uniqueId?.toUpperCase() === "OPERATOR");
      const current: KioskOperator | null = flagged ?? fallback ?? null;
      setKioskOperator(current);
      if (current?.gateId) setKioskGate(current.gateId);
    } catch { /* silent */ }
  }, []);

  const setKioskDefault = async (userId: string, gateId: string | null) => {
    setKioskBusy(true);
    try {
      const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
      const body: Record<string, unknown> = {};
      // Clear all other flags, set this one
      body.isKioskDefault = true;
      if (gateId !== null) body.gateId = gateId;
      const res = await fetch(`/api/users/${userId}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        addToast({ variant: "success", title: "Updated", message: "Default gate operator saved. The kiosk will now auto-sign in as this operator." });
        await loadKioskOperator();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to update default gate operator." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to update default gate operator." });
    } finally {
      setKioskBusy(false);
    }
  };

  const clearKioskDefault = async () => {
    if (!kioskOperator) return;
    setKioskBusy(true);
    try {
      const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
      const res = await fetch(`/api/users/${kioskOperator.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isKioskDefault: false }),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        addToast({ variant: "success", title: "Cleared", message: "Default gate operator designation removed." });
        setKioskOperator(null);
        setKioskGate("");
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to clear designation." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to clear designation." });
    } finally {
      setKioskBusy(false);
    }
  };

  const loadGates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gates", { headers: api.getHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) setGates(json.data || []);
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load gates." });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadGates(); loadKioskOperator(); }, [loadGates, loadKioskOperator]);

  // --- search users by name/roll/email for the assign picker ---
  const searchUsers = useCallback(async (q: string) => {
    setUserQuery(q);
    if (q.trim().length < 1) { setUserResults([]); return; }
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q.trim())}`, { headers: api.getHeaders(), cache: "no-store" });
      const json = await res.json();
      setUserResults(Array.isArray(json?.data) ? json.data.slice(0, 10) : []);
    } catch { setUserResults([]); }
  }, []);

  const saveGate = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
    const payload = { gateCode: form.gateCode, name: form.name, location: form.location, type: form.type, audience: form.audience };
    let ok = false;
    if (editing) {
      const res = await fetch(`/api/gates?id=${editing.id}`, { method: "PATCH", headers, body: JSON.stringify(payload) });
      ok = (await res.json()).success === true;
    } else {
      const res = await fetch("/api/gates", { method: "POST", headers, body: JSON.stringify(payload) });
      ok = (await res.json()).success === true;
    }
    if (ok) {
      addToast({ variant: "success", title: "Saved", message: editing ? "Gate updated." : "Gate created." });
      setShowAdd(false); setEditing(null);
      setForm({ gateCode: "", name: "", location: "", type: "main", audience: "all" });
      loadGates();
    } else {
      addToast({ variant: "error", title: "Error", message: "Failed to save gate." });
    }
  };

  const toggleActive = async (g: Gate) => {
    const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
    const res = await fetch(`/api/gates?id=${g.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isActive: !(g.is_active ?? true) }),
    });
    const json = await res.json();
    if (json.success) {
      addToast({ variant: "success", title: "Updated", message: `${g.name} is now ${g.is_active ? "inactive" : "active"}.` });
      loadGates();
    }
  };

  const removeGate = async (g: Gate) => {
    if (!confirm(`Deactivate gate "${g.name}"? (Historical logs are kept.)`)) return;
    const res = await fetch(`/api/gates?id=${g.id}`, { method: "DELETE", headers: api.getHeaders() });
    const json = await res.json();
    if (json.success) {
      addToast({ variant: "success", title: "Deactivated", message: `${g.name} hidden from live dashboards.` });
      loadGates();
    }
  };

  const assignUserToGate = async (u: AssignableUser) => {
    if (!assigningGate) return;
    const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ gateId: assigningGate.id }),
    });
    const json = await res.json();
    if (res.ok && json.success !== false) {
      addToast({ variant: "success", title: "Assigned", message: `${u.name || u.email || u.id} → ${assigningGate.name}. They can now access only this gate.` });
      setAssigningGate(null); setUserQuery(""); setUserResults([]);
    } else {
      addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to assign." });
    }
  };

  const gateCodeOf = (g: Gate) => g.gate_code || g.gateCode || "";

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <DoorOpen className="w-7 h-7 text-emerald-400" /> Gate Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">{gates.length} gates · add / edit / assign operators · all DB-driven</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ gateCode: "", name: "", location: "", type: "main", audience: "all" }); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 self-start">
            <Plus className="w-4 h-4" /> Add Gate
          </button>
        </div>

        {/* Gates grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {gates.map((g) => (
            <div key={g.id} className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">{g.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{g.location || "—"}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${g.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                  {g.is_active ? "Active" : "Off"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">{gateCodeOf(g) || g.id.slice(0, 8)}</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">{g.type || "—"}</span>
                {g.audience && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 capitalize">{g.audience}</span>}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button onClick={() => { setEditing(g); setForm({ gateCode: gateCodeOf(g), name: g.name, location: g.location || "", type: g.type || "main", audience: g.audience || "all" }); setShowAdd(true); }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-sky-400" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setAssigningGate(g)} className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400" title="Assign user to this gate"><UserCog className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggleActive(g)} className="p-1.5 rounded-lg hover:bg-slate-800 text-amber-400" title={g.is_active ? "Deactivate" : "Activate"}><Power className="w-3.5 h-3.5" /></button>
                <button onClick={() => removeGate(g)} className="p-1.5 rounded-lg hover:bg-slate-800 text-rose-400" title="Deactivate (soft)"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <form onSubmit={saveGate} className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {editing ? <Pencil className="w-4 h-4 text-sky-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                  {editing ? "Edit Gate" : "New Gate"}
                </h2>
                <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Gate code *</label>
                  <input required value={form.gateCode} onChange={(e) => setForm({ ...form, gateCode: e.target.value })}
                    placeholder="e.g. MAIN_BOYS" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Display name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Main Gate - Boys" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Main Entrance - Boys" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500">
                      {GATE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Audience / gender</label>
                    <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500">
                      {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500">{editing ? "Save" : "Create Gate"}</button>
              </div>
            </form>
          </div>
        )}

        {/* Assign-to-gate modal */}
        {assigningGate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-emerald-400" /> Assign to <span className="text-emerald-400">{assigningGate.name}</span>
                </h2>
                <button onClick={() => { setAssigningGate(null); setUserQuery(""); setUserResults([]); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-slate-400">Search a person by name, roll or email. Assigning scopes them to <strong className="text-slate-200">only this gate</strong> for their dashboards & logs.</p>
              <input
                value={userQuery}
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="Search name / roll / email…"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              {userResults.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto">
                  {userResults.map((u) => (
                    <button key={u.id} onClick={() => assignUserToGate(u)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition-colors flex items-center justify-between">
                      <span>
                        <span className="font-semibold text-white">{u.name || u.email}</span>
                        <span className="text-slate-500 ml-2">{u.role}{u.uniqueId ? ` · ${u.uniqueId}` : ""}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold">{u.gateId ? "Reassign" : "Assign"}</span>
                    </button>
                  ))}
                </div>
              )}
              {userQuery.trim().length >= 1 && userResults.length === 0 && (
                <p className="text-xs text-slate-500">No people matched.</p>
              )}
            </div>
          </div>
        )}

        {/* Default Gate Operator (Kiosk) Panel */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Default Gate Operator (Kiosk)</h3>
            <span className="text-[10px] text-slate-500">auto-sign-in for unattended kiosks</span>
          </div>
          <p className="text-xs text-slate-400">
            The designated operator is used by <code className="text-emerald-300">/api/operator/kiosk-session</code> to mint
            a short-lived session when the kiosk opens without credentials. Default kiosk PIN is <strong className="text-amber-400">1234</strong> —
            rotate it after first use via the kiosk PIN reset in the user management panel.
          </p>

          {kioskOperator ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {kioskOperator.name || kioskOperator.uniqueId || kioskOperator.id}
                    {kioskOperator.uniqueId && <span className="text-slate-500 font-normal ml-2">ID: {kioskOperator.uniqueId}</span>}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {kioskOperator.isKioskDefault
                      ? "Explicitly designated as kiosk default"
                      : "Built-in OPERATOR fallback (no explicit flag set)"}
                  </div>
                </div>
                <button onClick={clearKioskDefault} disabled={kioskBusy}
                  className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50">
                  Clear
                </button>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-1">Kiosk gate (default for auto-session)</label>
                  <select value={kioskGate} onChange={(e) => setKioskGate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500">
                    <option value="">— Operator's assigned gate —</option>
                    {gates.filter((g) => g.is_active !== false).map((g) => (
                      <option key={g.id} value={g.id}>{g.name}{g.gate_code ? ` (${g.gate_code})` : ""}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setKioskDefault(kioskOperator.id, kioskGate || null)} disabled={kioskBusy}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap">
                  {kioskBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No kiosk default operator found. Designate one below.</p>
          )}

          <div className="pt-2 border-t border-slate-800">
            <label className="text-[10px] text-slate-400 block mb-1.5">Designate operator account</label>
            <input
              value={userQuery}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search operator name / roll / email…"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            {userResults.length > 0 && (
              <div className="mt-2 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 max-h-36 overflow-y-auto">
                {userResults.map((u) => (
                  <button key={u.id} onClick={() => setKioskDefault(u.id, null)} disabled={kioskBusy}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition-colors flex items-center justify-between disabled:opacity-50">
                    <span>
                      <span className="font-semibold text-white">{u.name || u.email}</span>
                      <span className="text-slate-500 ml-2">{u.role}{u.uniqueId ? ` · ${u.uniqueId}` : ""}</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">Set as default</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
