"use client";


import React, { useState } from "react";
import { GateDeviceTracker, GateDevice } from "@/components/admin/GateDeviceTracker";
import { AlertCircle, Plus, CheckCircle2, Lock, Wrench, Moon, Check, Shield } from "lucide-react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

interface AdminGate {
  id: string;
  gateCode: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  audience: string | null;
  createdAt: string;
}

const SENTINEL_GATE_CODE = "UNKNOWN";

export default function AdminGatesPage() {
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [gates, setGates] = useState<AdminGate[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(true);
  const [loadingGates, setLoadingGates] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Gate Operations Mode state
  const [gateMode, setGateMode] = useState<"OPEN" | "CURFEW" | "MAINTENANCE">("OPEN");
  const [updatingMode, setUpdatingMode] = useState<boolean>(false);

  const fetchGateMode = async () => {
    try {
      const res = await fetch("/api/operator/mode", { cache: "no-store" });
      const json = await res.json();
      if (json?.success && json?.data?.mode) {
        setGateMode(json.data.mode);
      }
    } catch {}
  };

  const handleSetGateMode = async (newMode: "OPEN" | "CURFEW" | "MAINTENANCE") => {
    if (newMode === gateMode || updatingMode) return;
    setUpdatingMode(true);
    try {
      const res = await fetch("/api/operator/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ mode: newMode, reason: `Set to ${newMode} via Admin Console` }),
      });
      const json = await res.json();
      if (json?.success) {
        setGateMode(newMode);
      } else {
        setError(json?.error?.message || "Failed to update gate mode");
      }
    } catch {
      setError("Network error updating gate mode");
    } finally {
      setUpdatingMode(false);
    }
  };

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ gateCode: "", name: "", location: "", type: "standard", audience: "all" });

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await fetch("/api/gate/devices", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.success) {
        const devices = data.data?.devices ?? data.devices ?? (Array.isArray(data.data) ? data.data : []);
        setDevices(Array.isArray(devices) ? devices : []);
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to fetch gate telemetry";
        setError(msg);
      }
    } catch {
      setError("Network or server error loading gate telemetry");
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchGates = async () => {
    try {
      setLoadingGates(true);
      const res = await fetch("/api/admin/gates", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setGates(data.data || []);
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to load gates";
        setError(msg);
      }
    } catch {
      setError("Network or server error loading gates");
    } finally {
      setLoadingGates(false);
    }
  };

  useLiveRefresh(fetchDevices, { intervalMs: 20000 /* R15: name this profile */ /* R15: name this profile */ });
  useLiveRefresh(fetchGates, { intervalMs: 30000 });
  useLiveRefresh(fetchGateMode, { intervalMs: 15000 });

  const createGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          gateCode: createForm.gateCode.trim(),
          name: createForm.name.trim() || createForm.gateCode.trim(),
          location: createForm.location.trim() || "Campus",
          type: createForm.type,
          audience: createForm.audience,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateForm({ gateCode: "", name: "", location: "", type: "standard", audience: "all" });
        setShowCreate(false);
        await fetchGates();
      } else {
        setError(typeof data.error === "string" ? data.error : data.error?.message || "Failed to create gate");
      }
    } catch {
      setError("Network or server error creating gate");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Gates</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage gate roster, create gates, and monitor real-time terminal status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {showCreate ? "Hide Create Form" : "Create Gate"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Campus Gate Operations Mode */}
      <WidgetBoundary title="Campus Gate Operations Mode">
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Current Operating State
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${
                    gateMode === "OPEN"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : gateMode === "CURFEW"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {gateMode === "OPEN" && <Check className="w-3.5 h-3.5" />}
                  {gateMode === "CURFEW" && <Moon className="w-3.5 h-3.5" />}
                  {gateMode === "MAINTENANCE" && <Wrench className="w-3.5 h-3.5" />}
                  {gateMode}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {gateMode === "OPEN" && "All campus gates operating normally. Scans allowed."}
                  {gateMode === "CURFEW" && "Night curfew active. Scans require supervisor override."}
                  {gateMode === "MAINTENANCE" && "Gate maintenance in progress. Routine scans paused."}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={updatingMode}
                onClick={() => handleSetGateMode("OPEN")}
                className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  gateMode === "OPEN"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                Normal (OPEN)
              </button>
              <button
                type="button"
                disabled={updatingMode}
                onClick={() => handleSetGateMode("CURFEW")}
                className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  gateMode === "CURFEW"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Curfew
              </button>
              <button
                type="button"
                disabled={updatingMode}
                onClick={() => handleSetGateMode("MAINTENANCE")}
                className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  gateMode === "MAINTENANCE"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Maintenance
              </button>
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {/* Create form */}
      {showCreate && (
        <WidgetBoundary title="Create Gate">
          <form onSubmit={createGate} className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4">
            <h2 className="font-bold text-sm text-[var(--text-primary)]">New Gate</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Gate Code *</span>
                <input
                  value={createForm.gateCode}
                  onChange={(e) => setCreateForm({ ...createForm, gateCode: e.target.value })}
                  required
                  placeholder="e.g. G-MAIN"
                  className="mt-1 w-full min-h-[44px] px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Name</span>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Main Gate"
                  className="mt-1 w-full min-h-[44px] px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Location</span>
                <input
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  placeholder="Campus"
                  className="mt-1 w-full min-h-[44px] px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Type</span>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="mt-1 w-full min-h-[44px] px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                >
                  <option value="standard">standard</option>
                  <option value="staff">staff</option>
                  <option value="student">student</option>
                  <option value="emergency">emergency</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Audience</span>
                <select
                  value={createForm.audience}
                  onChange={(e) => setCreateForm({ ...createForm, audience: e.target.value })}
                  className="mt-1 w-full min-h-[44px] px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                >
                  <option value="all">all</option>
                  <option value="staff">staff</option>
                  <option value="student">student</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={creating || !createForm.gateCode.trim()}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {creating ? "Creating..." : "Create Gate"}
            </button>
          </form>
        </WidgetBoundary>
      )}

      {/* Gate roster */}
      <WidgetBoundary title="Gate Roster">
        {loadingGates && gates.length === 0 ? (
          <PageLoading />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <table className="w-full text-xs text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-4">Code</th>
                  <th className="pb-3 px-4">Name</th>
                  <th className="pb-3 px-4">Location</th>
                  <th className="pb-3 px-4">Type</th>
                  <th className="pb-3 px-4">Audience</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {gates.length === 0 && !loadingGates ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                      No gates found. Use the form above to create one.
                    </td>
                  </tr>
                ) : (
                  gates.map((g) => {
                    const isSentinel = g.gateCode.toUpperCase() === SENTINEL_GATE_CODE;
                    return (
                      <tr key={g.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                          <span className="flex items-center gap-1.5">
                            {isSentinel && <Lock className="w-3 h-3 text-amber-400" />}
                            {g.gateCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-primary)]">{g.name}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{g.location}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{g.type}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{g.audience ?? "all"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${g.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                            {g.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                          <Link
                            href={`/admin/gates/${g.id}`}
                            className="px-2.5 py-1 min-h-[44px] inline-flex items-center rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition"
                          >
                            Details & Status
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </WidgetBoundary>

      <WidgetBoundary title="Gate Telemetry & Device Status">
        {loadingDevices && devices.length === 0 ? (
          <PageLoading />
        ) : (
          <GateDeviceTracker devices={devices} />
        )}
      </WidgetBoundary>
    </div>
  );
}
