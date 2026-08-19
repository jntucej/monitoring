"use client";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Scan, Student } from "@/lib/types";

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
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [logsRes, stuRes] = await Promise.all([
          fetch(`/api/gate/logs?date=${date}&limit=10000`, { cache: "no-store" }),
          fetch(`/api/students`, { cache: "no-store" }),
        ]);
        const logsJson = await logsRes.json();
        const stuJson = await stuRes.json();
        if (cancelled) return;

        const logs: Scan[] = logsJson?.data?.items ?? [];
        const students: Student[] = stuJson?.data ?? [];

        // For each student: find first IN and last OUT of the day
        const byRoll: Record<string, Row> = {};
        for (const s of students) {
          const key = s.uniqueId || s.roll || "";
          if (!key) continue;
          byRoll[key] = {
            roll: key,
            name: s.fullName || s.name || "",
            department: s.department || "",
            timeIn: null,
            timeOut: null,
            status: "absent",
            lastTimestamp: null,
          };
        }
        for (const log of logs) {
          const row = (byRoll[log.roll] ??= {
            roll: log.roll,
            name: log.name,
            department: log.department || "",
            timeIn: null,
            timeOut: null,
            status: "absent",
            lastTimestamp: null,
          });
          if (log.direction === "IN") {
            if (!row.timeIn) row.timeIn = log.timestamp;
          } else if (log.direction === "OUT") {
            row.timeOut = log.timestamp;
          }
          row.lastTimestamp = log.timestamp;
        }
        // Determine status: present if timeIn, late if timeIn > 9:15am, absent if no timeIn
        for (const r of Object.values(byRoll)) {
          if (!r.timeIn) {
            r.status = "absent";
          } else {
            const inTime = new Date(r.timeIn);
            const cutoff = new Date(r.timeIn);
            cutoff.setHours(9, 15, 0, 0);
            r.status = inTime > cutoff ? "late" : "present";
          }
        }
        // Only show students that had any activity today OR mark as absent (capped)
        const present = Object.values(byRoll).filter((r) => r.timeIn || r.timeOut);
        const absent = Object.values(byRoll).filter((r) => !r.timeIn && !r.timeOut).slice(0, 50);
        setRows([...present, ...absent]);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const stats = {
    present: rows.filter((r) => r.status === "present").length,
    late: rows.filter((r) => r.status === "late").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-[var(--text-muted)]">Daily student attendance records</p>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Roll No</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Time In</th>
                <th className="p-4 font-medium">Time Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No records</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.roll}>
                    <td className="p-4 font-medium">{r.name}</td>
                    <td className="p-4 font-mono text-[var(--text-muted)]">{r.roll}</td>
                    <td className="p-4">
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
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">{fmtTime(r.timeIn)}</td>
                    <td className="p-4 text-[var(--text-muted)]">{fmtTime(r.timeOut)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
