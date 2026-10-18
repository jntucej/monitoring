"use client";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Scan, Student } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageHeader } from "@/components/admin/shared/PageHeader";

interface Row {
  roll: string;
  name: string;
  department: string;
  timeIn: string | null;
  timeOut: string | null;
  status: "present" | "absent" | "late";
  lastTimestamp: string | null;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * SysAdmin Attendance — ported from the admin console so the root operator can
 * review daily student attendance (present/late/absent by date).
 */
export default function SysAdminAttendancePage() {
  const api = useApi();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [logsRes, stuRes] = await Promise.all([
          fetch(`/api/gate/logs?date=${date}&limit=1000`, { headers: api.getHeaders(), cache: "no-store" }),
          fetch(`/api/students`, { headers: api.getHeaders(), cache: "no-store" }),
        ]);
        if (!logsRes.ok || !stuRes.ok) throw new Error("Failed to fetch attendance logs or student list");
        const logsJson = await logsRes.json();
        const stuJson = await stuRes.json();
        if (cancelled) return;
        const logs: Scan[] = logsJson?.data?.items ?? [];
        const students: Student[] = stuJson?.data ?? [];

        const byRoll: Record<string, Row> = {};
        for (const s of students) {
          const key = s.uniqueId || s.roll || "";
          if (!key) continue;
          byRoll[key] = { roll: key, name: s.fullName || s.name || "", department: s.department || "", timeIn: null, timeOut: null, status: "absent", lastTimestamp: null };
        }
        for (const log of logs) {
          const row = (byRoll[log.roll] ??= { roll: log.roll, name: log.name, department: log.department || "", timeIn: null, timeOut: null, status: "absent", lastTimestamp: null });
          if (log.direction === "IN") { if (!row.timeIn) row.timeIn = log.timestamp; }
          else if (log.direction === "OUT") { row.timeOut = log.timestamp; }
          row.lastTimestamp = log.timestamp;
        }
        for (const r of Object.values(byRoll)) {
          if (!r.timeIn) r.status = "absent";
          else {
            const inTime = new Date(r.timeIn);
            const cutoff = new Date(r.timeIn);
            cutoff.setHours(9, 15, 0, 0);
            r.status = inTime > cutoff ? "late" : "present";
          }
        }
        const present = Object.values(byRoll).filter((r) => r.timeIn || r.timeOut);
        const absent = Object.values(byRoll).filter((r) => !r.timeIn && !r.timeOut).slice(0, 50);
        setRows([...present, ...absent]);
      } catch (err: any) {
        console.error("Failed to load attendance data:", err);
        if (!cancelled) setError(err?.message || "Failed to load attendance data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [date, api]);

  const stats = {
    present: rows.filter((r) => r.status === "present").length,
    late: rows.filter((r) => r.status === "late").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="space-y-6">
        <PageHeader title="Attendance" subtitle="Daily student attendance records" />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.present}</p>
            <p className="text-xs text-[var(--text-muted)]">Present</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.late}</p>
            <p className="text-xs text-[var(--text-muted)]">Late</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <p className="text-2xl font-bold text-rose-400">{stats.absent}</p>
            <p className="text-xs text-[var(--text-muted)]">Absent</p>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--action-primary)]" />
              {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </h3>
            <span className="text-sm text-[var(--text-muted)]">
              {loading ? "Loading…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <DataTable
            columns={[
              { header: "Student", accessor: (r) => r.name, className: "font-medium" },
              { header: "Roll No", accessor: (r) => r.roll, className: "font-mono text-[var(--text-muted)]" },
              {
                header: "Status",
                accessor: (r) => (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    r.status === "present" ? "bg-emerald-500/10 text-emerald-400" :
                    r.status === "absent" ? "bg-rose-500/10 text-rose-400" :
                    "bg-amber-500/10 text-amber-400"
                  }`}>
                    {r.status === "present" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                     r.status === "absent" ? <XCircle className="w-3.5 h-3.5" /> :
                     <Clock className="w-3.5 h-3.5" />}
                    <span className="capitalize">{r.status}</span>
                  </span>
                ),
              },
              { header: "Time In", accessor: (r) => fmtTime(r.timeIn), className: "text-[var(--text-muted)]" },
              { header: "Time Out", accessor: (r) => fmtTime(r.timeOut), className: "text-[var(--text-muted)]" },
            ]}
            data={rows}
            loading={loading}
            error={error}
            emptyMessage="No attendance records for this date."
            keyExtractor={(r) => r.roll}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
