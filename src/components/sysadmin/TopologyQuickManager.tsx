"use client";

import React, { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { Loader2, Plus, RefreshCw, Building2, DoorOpen } from "lucide-react";

/**
 * TopologyQuickManager — 1-click course / gate creation + full hierarchy
 * rebuild. Mount at the top of /sysadmin/roles + /admin/institutional-configuration.
 * All actions POST to /api/sysadmin/topology (a single transaction that
 * inserts the unit, scaffolds its sections, audits, and flushes the catalog
 * cache so every dashboard refreshes instantly).
 */
export function TopologyQuickManager({ onRebuilt }: { onRebuilt?: () => void }) {
  const [mode, setMode] = useState<"idle" | "course" | "gate" | "facility" | "org_unit">("idle");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("GATE");
  const [unitType, setUnitType] = useState("DEPARTMENT");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const runAction = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/sysadmin/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
      setStatusMsg({
        type: "ok",
        text: "Topology updated & all caches rebuilt.",
      });
      setCode("");
      setName("");
      setLocation("");
      setMode("idle");
      onRebuilt?.();
    } catch (e) {
      setStatusMsg({
        type: "err",
        text: e instanceof Error ? `Failed: ${e.message}` : "Action failed",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card bg-bg-surface rounded-2xl p-4 space-y-3 text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">1-Click Topology &amp; Hierarchy Manager</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Add a course / gate and rebuild the live hierarchy instantly. Hostel
            blocks are data-driven (student_details) — a new block becomes valid
            automatically, no row to insert.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(mode === "course" ? "idle" : "course")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-action-primary text-white text-xs font-semibold disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> New Course / Branch
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(mode === "gate" ? "idle" : "gate")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <DoorOpen className="h-3.5 w-3.5" /> New Gate
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(mode === "facility" ? "idle" : "facility")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Building2 className="h-3.5 w-3.5" /> New Facility
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(mode === "org_unit" ? "idle" : "org_unit")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Building2 className="h-3.5 w-3.5" /> New Org Unit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction({ action: "rebuild_hierarchy" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Rebuilding…" : "Rebuild Entire Hierarchy"}
          </button>
        </div>
      </div>

      {mode !== "idle" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "course") {
              void runAction({
                action: "add_course",
                code,
                name,
                years: 4,
                sectionsPerYear: 1,
              });
            } else if (mode === "gate") {
              void runAction({ action: "add_gate", code, name, location });
            } else if (mode === "facility") {
              void runAction({ action: "add_facility", code, name, category });
            } else if (mode === "org_unit") {
              void runAction({ action: "add_org_unit", code, name, unitType });
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-border"
        >
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={
              mode === "course"
                ? "Code (e.g. AIDS)"
                : mode === "gate"
                ? "Code (e.g. GATE-5)"
                : mode === "facility"
                ? "Code (e.g. HOSTEL_GH3)"
                : "Code (e.g. AI_ROBOTICS)"
            }
            className="px-3 py-2 rounded-xl border border-border bg-bg-elevated text-xs font-medium"
          />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              mode === "course"
                ? "Full Name (e.g. B.Tech AI & DS)"
                : mode === "gate"
                ? "Gate name (e.g. East Gate)"
                : mode === "facility"
                ? "Facility name (e.g. Girls Hostel 3)"
                : "Unit name (e.g. AI & Robotics Dept)"
            }
            className={`px-3 py-2 rounded-xl border border-border bg-bg-elevated text-xs font-medium ${
              mode === "course" ? "sm:col-span-2" : ""
            }`}
          />
          {mode === "gate" && (
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Main Entrance)"
              className="px-3 py-2 rounded-xl border border-border bg-bg-elevated text-xs font-medium"
            />
          )}
          {mode === "facility" && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-bg-elevated text-xs font-medium"
            >
              <option value="GATE">Gate</option>
              <option value="HOSTEL_BLOCK">Hostel Block</option>
              <option value="EXAM_HALL">Exam Hall</option>
              <option value="LAB">Lab</option>
            </select>
          )}
          {mode === "org_unit" && (
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-bg-elevated text-xs font-medium"
            >
              <option value="INSTITUTE">Institute</option>
              <option value="DEPARTMENT">Department</option>
              <option value="DIVISION">Division</option>
            </select>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
          >
            <Building2 className="h-3.5 w-3.5" />
            Create &amp; Rebuild
          </button>
        </form>
      )}

      {statusMsg && (
        <div
          className={`text-xs font-semibold rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 ${
            statusMsg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMsg.type === "ok" ? (
            <Plus className="h-3.5 w-3.5" />
          ) : (
            <Loader2 className="h-3.5 w-3.5" />
          )}
          {statusMsg.text}
        </div>
      )}
    </div>
  );
}
