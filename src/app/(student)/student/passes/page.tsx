"use client";
import { useEffect, useState } from "react";
import { Ticket, Loader2, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import type { GatePass } from "@/lib/types";

function statusStyle(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return "bg-emerald-500/10 text-emerald-400";
  if (status === "REJECTED") return "bg-rose-500/10 text-rose-400";
  return "bg-amber-500/10 text-amber-400";
}

function statusIcon(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return <CheckCircle2 className="w-3 h-3" />;
  if (status === "REJECTED") return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

export default function StudentPassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
      const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setPasses(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignore
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
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
      const fromIso = from ? new Date(from).toISOString() : new Date().toISOString();
      const toIso = to ? new Date(to).toISOString() : new Date(Date.now() + 8 * 3600 * 1000).toISOString();

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll,
          reason: reason || "Leave",
          from: fromIso,
          to: toIso,
          description,
          requestedById: auth?.user?.id,
          requestedByName: auth?.user?.name,
        }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Pass request submitted. Awaiting parent + admin approval.");
        setReason("");
        setFrom("");
        setTo("");
        setDescription("");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to submit"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Passes</h1>
          <p className="text-[var(--text-muted)]">Manage your gate pass requests</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-primary)] text-white text-sm font-medium hover:brightness-110"
        >
          <Plus className="w-4 h-4" /> New Pass Request
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family function"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">From</label>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit"}
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

      {msg && (
        <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[var(--action-primary)]" />
            Pass History
          </h3>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : passes.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No pass requests yet. Use the button above to create one.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {passes.map((pass) => (
              <div key={pass.id} className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium">{pass.reason}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle(pass.finalStatus)}`}>
                    {statusIcon(pass.finalStatus)}
                    <span>{pass.finalStatus}</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {new Date(pass.from).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" → "}
                  {new Date(pass.to).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                {pass.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5 italic">"{pass.description}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
