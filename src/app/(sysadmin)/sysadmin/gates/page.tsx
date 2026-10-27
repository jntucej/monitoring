"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
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
  }, [api]);

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
  }, [addToast, api]);

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
  }, [api]);

  const saveGate = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
    const payload = { gateCode: form.gateCode, name: form.name, location: form.location, type: form.type, audience: form.audience };
    let ok = false;
    if (editing) {
      const res = await fetch(`/api/gates/${encodeURIComponent(editing.id)}`, { method: "PATCH", headers, body: JSON.stringify(payload) });
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
    const res = await fetch(`/api/gates/${encodeURIComponent(g.id)}`, {
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
    const res = await fetch(`/api/gates/${encodeURIComponent(g.id)}`, { method: "DELETE", headers: api.getHeaders() });
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
            <p className="text-2xl font-bold text-white flex items-center gap-2.5">
              <DoorOpen className="w-7 h-7 text-emerald-400" /> Gate Management
            </p>
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
                <button type="button" onClick={() => { setEditing(g); setForm({ gateCode: gateCodeOf(g), name: g.name, location: g.location || "", type: g.type || "main", audience: g.audience || "all" }); setShowAdd(true); }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-sky-400" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => setAssigningGate(g)} className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400" title="Assign user to this gate"><UserCog className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => toggleActive(g)} className="p-1.5 rounded-lg hover:bg-slate-800 text-amber-400" title={g.is_active ? "Deactivate" : "Activate"}><Power className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => removeGate(g)} className="p-1.5 rounded-lg hover:bg-slate-800 text-rose-400" title="Deactivate (soft)"><Trash2 className="w-3.5 h-3.5" /></button>
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
                  <label className="text-slate-400 block mb-1">Location description</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. North campus near block 3" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500" />
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
                    <label className="text-slate-400 block mb-1">Audience scope</label>
                    <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500">
                      {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Save Gate</button>
              </div>
            </form>
          </div>
        )}

        {/* Assign operator modal */}
        {assigningGate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-emerald-400" /> Assign Operator → {assigningGate.name}
                </h2>
                <button type="button" onClick={() => setAssigningGate(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Search user by name, roll or email</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input autoFocus value={userQuery} onChange={(e) => searchUsers(e.target.value)}
                      placeholder="Type at least 2 chars..." className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-800/50">
                  {userResults.map((u) => (
                    <div key={u.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white">{u.name || u.email || u.id}</div>
                        <div className="text-[11px] text-slate-400">{u.role} · {u.uniqueId || u.email}</div>
                      </div>
                      <button type="button" onClick={() => assignUserToGate(u)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0">
                        Assign
                      </button>
                    </div>
                  ))}
                  {userQuery.trim().length >= 2 && userResults.length === 0 && (
                    <p className="text-center py-4 text-slate-500">No matching users found.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setAssigningGate(null)} className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-300 text-xs font-semibold">Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Kiosk default operator designation */}
        <WidgetBoundary title="Gate-Kiosk Default Session">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-400" /> Kiosk Default Operator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Designate one operator account to act as the default identity for unattended touch-kiosks.
                </p>
              </div>
              {kioskOperator && (
                <button type="button" onClick={clearKioskDefault} disabled={kioskBusy}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold disabled:opacity-50 self-start">
                  Clear Designation
                </button>
              )}
            </div>

            {kioskOperator ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{kioskOperator.name || kioskOperator.email || kioskOperator.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">Active Kiosk ID</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">Unique ID: {kioskOperator.uniqueId || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={kioskGate} onChange={(e) => setKioskGate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none">
                    <option value="">Select Default Gate…</option>
                    {gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setKioskDefault(kioskOperator.id, kioskGate || null)} disabled={kioskBusy || !kioskGate}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50">
                    Save Gate Bind
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                  No operator account is currently designated as the kiosk default. Choose an operator below to promote them.
                </p>
                <div className="flex items-center gap-2">
                  <select id="kiosk-select" className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none flex-1">
                    <option value="">Select operator account…</option>
                  </select>
                  <button type="button" onClick={() => {
                    const sel = (document.getElementById("kiosk-select") as HTMLSelectElement)?.value;
                    if (sel) setKioskDefault(sel, gates[0]?.id || null);
                  }} disabled={kioskBusy} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                    Designate as Kiosk Default
                  </button>
                </div>
              </div>
            )}
          </div>
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
