// src/app/(approver)/principal/passes/page.tsx
// Generate a hostel pass directly (Path B — authority-issued, no approval chain).
// Warden ≡ Principal in this institution, so the surface lives here.
// Rank-aware: the caller's role tier bounds which reasons they may issue.

"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const REASONS = [
  { value: "home_out", label: "Home / Outing (rank 1)", rank: 1 },
  { value: "day_pass", label: "Day Pass (rank 1)", rank: 1 },
  { value: "special_leave", label: "Special Leave (rank 2)", rank: 2 },
  { value: "emergency", label: "Emergency (rank 3)", rank: 3 },
];

export default function PrincipalPassesPage() {
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState("home_out");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const role = user?.role ?? "principal";

  // Which reasons may this role tier issue?
  const allowed = useMemo(() => {
    const maxRank = role === "deputy_warden" ? 2 : 3; // principal/admin/sysadmin = 3
    return REASONS.filter((r) => r.rank <= maxRank);
  }, [role]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/permissions?workflow=hostel&status=APPROVED&limit=50`,
          { headers: getAuthHeaders(), cache: "no-store" }
        );
        const json = await res.json().catch(() => null);
        const rows = json?.data?.items ?? json?.items ?? [];
        setRecent(rows.filter((r: any) => r.direct_generated).slice(0, 12));
      } catch {
        setRecent([]);
      }
    })();
  }, []);

  async function generate() {
    if (!studentId || !from) {
      setResult("Student and start time are required.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/permissions/direct-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          studentUserId: studentId,
          reason,
          from,
          to: to || null,
          note: note || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(`Generated ${json.ticket ?? "pass"} for ${studentName || studentId} — status APPROVED, no approval chain (authority-issued).`);
        setStudentId(""); setFrom(""); setTo(""); setNote("");
      } else {
        setResult(`Failed (${res.status}): ${json.message ?? json.error ?? "see console"}`);
      }
    } catch (e: any) {
      setResult(`Request error: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Generate Pass</h1>
        <p className="text-xs text-text-muted">
          Authority-issued (Path B) — no approval chain. The generating authority is the
          approval. Recorded as <code>pass.generated</code>, not <code>pass.approved</code>.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-bg-base p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Student ID</span>
            <input className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="uuid" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Student name (optional)</span>
            <input className={input} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="for display only" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Pass type</span>
            <select className={input} value={reason} onChange={(e) => setReason(e.target.value)}>
              {allowed.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <div />
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Valid from</span>
            <input type="datetime-local" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Valid until (optional)</span>
            <input type="datetime-local" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-text-muted">Reason / note</span>
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Inter-college competition, 3 students representing CSE" />
          </label>
        </div>
        {role === "deputy_warden" && (
          <p className="mt-2 text-xs text-amber-500">
            Deputy Warden tier: emergency (rank 3) is not available to you.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
        {result && (
          <p className={`mt-3 text-sm ${result.startsWith("Failed") || result.startsWith("Request") ? "text-action-danger" : "text-action-success"}`}>
            {result}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-bg-base p-4">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Recently generated</h2>
        {recent.length === 0 ? (
          <p className="text-xs text-text-muted">No generated passes in this view yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="pb-1 pr-3">Ticket</th>
                <th className="pb-1 pr-3">Student</th>
                <th className="pb-1 pr-3">From</th>
                <th className="pb-1 pr-3">To</th>
                <th className="pb-1">Reason</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5 pr-3 font-mono">{r.ticket_number}</td>
                  <td className="py-1.5 pr-3">{r.student_user_id?.slice(0, 8)}</td>
                  <td className="py-1.5 pr-3">{new Date(r.from_date).toLocaleString()}</td>
                  <td className="py-1.5 pr-3">{r.to_date ? new Date(r.to_date).toLocaleString() : "—"}</td>
                  <td className="py-1.5">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
