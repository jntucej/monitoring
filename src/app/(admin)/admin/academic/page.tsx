"use client";

import { useCallback, useEffect, useState } from "react";

interface BranchRow {
  code: string;
  short_name: string;
  full_name: string;
  is_active: boolean;
  effective_from: string;
}

interface YearRow {
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface ExceptionRow {
  id: string;
  target_type: string;
  target_id: string;
  exception_date: string;
  override_mode: string;
  reason: string;
}

interface DeadlineRow {
  id: string;
  name: string;
  deadline_type: string;
  deadline_at: string;
  extended_until: string | null;
  status: string;
}

export default function AdminAcademicPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([]);
  const [code, setCode] = useState("");
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [exDate, setExDate] = useState("");
  const [exReason, setExReason] = useState("");
  const [dlName, setDlName] = useState("");
  const [dlDate, setDlDate] = useState("");
  const [promoteAy, setPromoteAy] = useState("2027-28");
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/academic/catalogs")
      .then((r) => r.json())
      .then((j) => {
        setBranches(j?.data?.branches ?? []);
        setYears(j?.data?.academic_years ?? []);
      })
      .catch(() => {});
    fetch("/api/schedules/exceptions")
      .then((r) => r.json())
      .then((j) => setExceptions(j?.data?.exceptions ?? []))
      .catch(() => {});
    fetch("/api/academic/deadlines")
      .then((r) => r.json())
      .then((j) => setDeadlines(j?.data?.deadlines ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !shortName.trim() || !fullName.trim()) return;
    await fetch("/api/academic/catalogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "branch", code, short_name: shortName, full_name: fullName }),
    });
    setCode("");
    setShortName("");
    setFullName("");
    load();
  }

  async function addException(e: React.FormEvent) {
    e.preventDefault();
    if (!exDate || !exReason.trim()) return;
    await fetch("/api/schedules/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "campus",
        target_id: "all",
        exception_date: exDate,
        override_mode: "holiday",
        reason: exReason,
      }),
    });
    setExDate("");
    setExReason("");
    load();
  }

  async function addDeadline(e: React.FormEvent) {
    e.preventDefault();
    if (!dlName.trim() || !dlDate) return;
    await fetch("/api/academic/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dlName, deadline_type: "academic", deadline_at: `${dlDate}T23:59:00Z` }),
    });
    setDlName("");
    setDlDate("");
    load();
  }

  async function archiveDeadline(id: string) {
    await fetch("/api/academic/deadlines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function runPromotion() {
    const r = await fetch("/api/academic/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_academic_year_code: promoteAy }),
    });
    const j = await r.json();
    if (j?.data) {
      setPromoteMsg(`Promoted: ${j.data.promoted}, Graduated: ${j.data.graduated}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Academic Catalogs & Schedule Exceptions</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Academic Years ({years.length})</h2>
        <div className="space-y-1">
          {years.map((y) => (
            <div key={y.code} className="flex justify-between py-1.5 text-xs text-foreground">
              <span>
                <strong>{y.code}</strong> ({y.start_date.slice(0, 10)} → {y.end_date.slice(0, 10)})
              </span>
              <span className="text-primary">{y.is_current ? "CURRENT" : "ARCHIVED"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Branches ({branches.length})</h2>
        <form onSubmit={addBranch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (e.g. 66)"
            className="border-b border-border text-xs text-foreground"
          />
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="Short (e.g. CSM)"
            className="border-b border-border text-xs text-foreground"
          />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            className="border-b border-border text-xs text-foreground"
          />
          <button type="submit" className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Add / Update Branch
          </button>
        </form>
        <div className="space-y-1">
          {branches.map((b) => (
            <div key={b.code} className="flex justify-between py-1.5 text-xs text-foreground">
              <span>
                [{b.code}] <strong>{b.short_name}</strong> — {b.full_name}
              </span>
              <span className="text-muted-foreground">Effective {b.effective_from.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Schedule Exceptions ({exceptions.length})</h2>
        <form onSubmit={addException} className="flex flex-wrap gap-2">
          <input
            type="date"
            value={exDate}
            onChange={(e) => setExDate(e.target.value)}
            className="border-b border-border text-xs text-foreground"
          />
          <input
            type="text"
            value={exReason}
            onChange={(e) => setExReason(e.target.value)}
            placeholder="Reason (e.g. Mid-Exam / Holiday)"
            className="border-b border-border text-xs text-foreground"
          />
          <button type="submit" className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Add Exception
          </button>
        </form>
        <div className="space-y-1">
          {exceptions.map((ex) => (
            <div key={ex.id} className="flex justify-between py-1.5 text-xs text-foreground">
              <span>
                {ex.exception_date.slice(0, 10)} [{ex.target_type}:{ex.target_id}] — {ex.override_mode}
              </span>
              <span className="text-muted-foreground">{ex.reason}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Institutional Deadlines ({deadlines.length})</h2>
        <form onSubmit={addDeadline} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={dlName}
            onChange={(e) => setDlName(e.target.value)}
            placeholder="Deadline name"
            className="border-b border-border text-xs text-foreground"
          />
          <input
            type="date"
            value={dlDate}
            onChange={(e) => setDlDate(e.target.value)}
            className="border-b border-border text-xs text-foreground"
          />
          <button type="submit" className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Add Deadline
          </button>
        </form>
        <div className="space-y-1">
          {deadlines.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-1.5 text-xs text-foreground">
              <span>
                <strong>{d.name}</strong> ({d.status}) — {(d.extended_until ?? d.deadline_at).slice(0, 10)}
              </span>
              {d.status !== "archived" && (
                <button type="button" onClick={() => archiveDeadline(d.id)} className="text-destructive underline">
                  Archive
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Batch Academic Progression</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={promoteAy}
            onChange={(e) => setPromoteAy(e.target.value)}
            placeholder="Target AY (e.g. 2027-28)"
            className="border-b border-border text-xs text-foreground"
          />
          <button
            type="button"
            onClick={runPromotion}
            className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            Run AY Promotion
          </button>
          {promoteMsg && <span className="text-xs text-primary">{promoteMsg}</span>}
        </div>
      </section>
    </div>
  );
}
