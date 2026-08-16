"use client";
import { useEffect, useState } from "react";
import { DoorOpen, PlusCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Gate } from "@/lib/types";

export function GateManagement() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"main" | "hostel" | "back">("main");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gates", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setGates(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gates");
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
      const res = await fetch("/api/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, type, isActive: true }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Gate added.");
        setName("");
        setLocation("");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to add gate"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (gate: Gate) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/gates/${gate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !gate.isActive }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Gate status updated.");
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to update gate"}`);
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
        <h3 className="font-semibold">Gate Management</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"
        >
          <PlusCircle className="w-5 h-5" />
          Add Gate
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
              placeholder="e.g. Main Gate"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. North Campus"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "main" | "hostel" | "back")}
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            >
              <option value="main">Main</option>
              <option value="hostel">Hostel</option>
              <option value="back">Back</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Gate"}
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
          <Loader2 className="w-4 h-4 animate-spin" /> Loading gates…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load gates</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : gates.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          No gates configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {gates.map((gate) => (
            <div key={gate.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <DoorOpen className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{gate.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {gate.location} • {gate.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleActive(gate)}
                  className={`text-sm font-medium px-3 py-1 rounded-full ${gate.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
                >
                  {gate.isActive ? "Active" : "Inactive"}
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
