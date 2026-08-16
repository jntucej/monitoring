"use client";
import { useState } from "react";
import { Ticket, Loader2, CheckCircle2 } from "lucide-react";
import type { Student } from "@/lib/types";

const PASS_TYPES = ["Day Pass", "Weekend Pass", "Emergency Leave"] as const;

export function RequestPassForm() {
  const [passType, setPassType] = useState<typeof PASS_TYPES[number]>("Day Pass");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSuccess(null);
    try {
      // Look up the parent's first child
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
      const res = await fetch(`/api/students?parentId=${parentId}`, { cache: "no-store" });
      const json = await res.json();
      const kids: Student[] = Array.isArray(json.data) ? json.data : [];
      const child = kids[0];
      if (!child) {
        setSuccess("❌ No linked student to issue a pass for.");
        setBusy(false);
        return;
      }

      // Build a sensible from/to: now → +duration
      const fromIso = from ? new Date(from).toISOString() : new Date().toISOString();
      let toIso: string;
      if (to) {
        toIso = new Date(to).toISOString();
      } else {
        const t = new Date();
        if (passType === "Day Pass") t.setHours(t.getHours() + 8);
        else if (passType === "Weekend Pass") t.setDate(t.getDate() + 2);
        else t.setHours(t.getHours() + 4);
        toIso = t.toISOString();
      }

      const passRes = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll: child.roll,
          reason: `${passType}${reason ? ` — ${reason}` : ""}`,
          from: fromIso,
          to: toIso,
          description: reason,
          requestedById: auth?.user?.id,
          requestedByName: auth?.user?.name,
        }),
      });
      const passJson = await passRes.json();
      if (passRes.ok && passJson.success) {
        setSuccess("✅ Pass request submitted. Awaiting admin approval.");
        setReason("");
      } else {
        setSuccess(`❌ ${passJson.error?.message ?? "Failed to submit pass"}`);
      }
    } catch {
      setSuccess("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Request a Pass</h3>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="passType" className="block text-sm font-medium text-gray-300">
            Pass Type
          </label>
          <select
            id="passType"
            value={passType}
            onChange={(e) => setPassType(e.target.value as typeof PASS_TYPES[number])}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 py-2 pl-3 pr-10 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
          >
            {PASS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-gray-300">From</label>
            <input
              id="from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm font-medium text-gray-300">To</label>
            <input
              id="to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-700 text-white sm:text-sm p-2 bg-gray-800"
            />
          </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-300">
            Reason
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Optional details for the admin…"
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Ticket className="mr-2 h-5 w-5" />}
          Request Pass
        </button>
        {success && (
          <div className={`text-sm ${success.startsWith("✅") ? "text-emerald-400" : "text-rose-400"} flex items-center gap-1.5`}>
            {success.startsWith("✅") && <CheckCircle2 className="w-4 h-4" />}
            <span>{success}</span>
          </div>
        )}
      </form>
    </div>
  );
}
