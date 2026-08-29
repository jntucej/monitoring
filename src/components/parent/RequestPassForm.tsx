"use client";
import { useEffect, useState } from "react";
import { Ticket, Loader2, CheckCircle2 } from "lucide-react";
import type { Student } from "@/lib/types";
import { usePassTypes } from "@/hooks/usePassTypes";
import { getAuthHeaders } from "@/lib/utils";

export function RequestPassForm() {
  const { passTypes, loading: loadingPassTypes } = usePassTypes();
  const [passType, setPassType] = useState("");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (passTypes.length > 0 && !passType) {
      setPassType(passTypes[0].code);
    }
  }, [passTypes, passType]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSuccess(null);
    try {
      // Look up the parent's first child
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
      const res = await fetch(`/api/students?parentId=${parentId}`, { 
        headers: getAuthHeaders(),
        cache: "no-store" 
      });
      const json = await res.json();
      const kids: Student[] = Array.isArray(json.data) ? json.data : [];
      const child = kids[0];
      if (!child) {
        setSuccess("❌ No linked student to issue a pass for.");
        setBusy(false);
        return;
      }

      const selectedTypeCode = passType || passTypes[0]?.code || "day_pass";
      const selectedType = passTypes.find((pt) => pt.code === selectedTypeCode);

      // Build a sensible from/to: now → +duration
      const fromIso = from ? new Date(from).toISOString() : new Date().toISOString();
      let toIso: string;
      if (to) {
        toIso = new Date(to).toISOString();
      } else {
        const t = new Date();
        const duration = selectedType?.defaultDurationHours || 4;
        t.setHours(t.getHours() + duration);
        toIso = t.toISOString();
      }

      const passRes = await fetch("/api/passes", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          roll: child.roll,
          reason: selectedTypeCode,
          from: fromIso,
          to: toIso,
          description: reason,
          requestedById: auth?.user?.id,
          requestedByName: auth?.user?.name,
        }),
      });
      const passJson = await passRes.json();
      if (passRes.ok && passJson.success) {
        setSuccess("✅ Pass request submitted. Awaiting approval.");
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
          <label htmlFor="passType" className="block text-sm font-medium text-[var(--text-secondary)]">
            Pass Type
          </label>
          <select
            id="passType"
            value={passType || passTypes[0]?.code || ""}
            onChange={(e) => setPassType(e.target.value)}
            className="mt-1 block w-full rounded-md border-[var(--border-strong)] bg-[var(--bg-elevated)] py-2 pl-3 pr-10 text-base text-[var(--text-primary)] focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
            disabled={loadingPassTypes}
            required
          >
            {passTypes.map((t) => (
              <option key={t.code} value={t.code}>{t.name} ({t.defaultDurationHours} hrs)</option>
            ))}
          </select>
          {passType && (
            <p className="text-xs text-[var(--text-muted)] mt-1 italic">
              {passTypes.find((pt) => pt.code === passType)?.description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-[var(--text-secondary)]">From</label>
            <input
              id="from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] sm:text-sm p-2"
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm font-medium text-[var(--text-secondary)]">To</label>
            <input
              id="to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block w-full rounded-md border-[var(--border-strong)] text-[var(--text-primary)] sm:text-sm p-2 bg-[var(--bg-elevated)]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-[var(--text-secondary)]">
            Reason
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Optional details for the admin…"
            className="mt-1 block w-full rounded-md border-[var(--border-strong)] bg-[var(--bg-elevated)] text-white shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
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
