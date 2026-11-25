"use client";

import { useCallback, useEffect, useState } from "react";

interface CaretakerMessData {
  block_id: string;
  session: { id: string; meal_date: string; meal_type: string };
  expected: number;
  scanned: number;
  not_scanned: number;
  residents: Array<{ id: string; roll_no: string; name: string; last_scan: string | null }>;
  feed: Array<{ id: string; scanned_at: string; outcome: string; roll_no: string; student_name: string }>;
}

export default function CaretakerMessPage() {
  const [data, setData] = useState<CaretakerMessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");

  const load = useCallback(() => {
    fetch("/api/caretaker/mess")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) setData(j.data);
        else setError(j?.error?.message ?? "Unable to load block mess view");
      })
      .catch(() => setError("Failed to load block mess view"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function checkOn(studentId: string) {
    await fetch("/api/caretaker/mess/check-on", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    });
  }

  async function reportIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDesc.trim()) return;
    const r = await fetch("/api/caretaker/mess/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: issueTitle.trim(), description: issueDesc.trim() }),
    });
    if (r.ok) {
      setIssueTitle("");
      setIssueDesc("");
    }
  }

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-foreground">Loading block mess lens...</div>;

  const notScanned = data.residents.filter((r) => !r.last_scan);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Block {data.block_id} • {data.session.meal_type} ({data.session.meal_date})
        </h1>
        <p className="text-sm text-muted-foreground">
          Expected: {data.expected} • Scanned: {data.scanned} • Not yet scanned: {data.not_scanned}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Not Yet Scanned ({notScanned.length})</h2>
        <div className="max-h-64 space-y-1 overflow-y-auto text-sm text-foreground">
          {notScanned.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1">
              <span>
                {r.roll_no} — {r.name}
              </span>
              <button
                type="button"
                onClick={() => checkOn(r.id)}
                className="px-2 py-0.5 text-xs text-primary underline"
              >
                Flag Check-On
              </button>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={reportIssue} className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Report Mess Issue</h2>
        <input
          type="text"
          value={issueTitle}
          onChange={(e) => setIssueTitle(e.target.value)}
          placeholder="Issue title"
          className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          required
        />
        <textarea
          value={issueDesc}
          onChange={(e) => setIssueDesc(e.target.value)}
          placeholder="Details for mess incharge"
          className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Submit Issue
        </button>
      </form>
    </div>
  );
}
