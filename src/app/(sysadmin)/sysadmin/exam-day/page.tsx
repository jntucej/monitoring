"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList, Loader2, ShieldCheck,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface AccessRow {
  id: string;
  ticket_number: string | null;
  current_stage: string | null;
  status: string;
  sla_deadline: string | null;
  candidate_name: string | null;
  candidate_unique_id: string | null;
  roll: string | null;
}

interface StageSummary {
  current_stage: string;
  status: string;
  count: number;
}

interface AttendanceRow {
  id: string;
  candidate_name: string | null;
  candidate_unique_id: string | null;
  roll: string | null;
  status: string;
  recorded_at: string | null;
}

/**
 * Sysadmin Exam Day — exam-day gate access state + clearance desk overview.
 * Backend: /api/exam/access + /api/exam/candidate-attendance (exam-superint scope).
 */
function SysadminExamDayInner() {
  const [authorised, setAuthorised] = useState<AccessRow[]>([]);
  const [stageSummary, setStageSummary] = useState<StageSummary[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, attRes] = await Promise.all([
        fetch("/api/exam/access?limit=50", { headers: getAuthHeaders() }),
        fetch("/api/exam/candidate-attendance?limit=50", { headers: getAuthHeaders() }),
      ]);
      const accBody = await accRes.json().catch(() => null);
      const attBody = await attRes.json().catch(() => null);
      setAuthorised((accBody?.data?.authorised ?? []) as AccessRow[]);
      setStageSummary((accBody?.data?.stageSummary ?? []) as StageSummary[]);
      setAttendance((attBody?.data ?? []) as AttendanceRow[]);
    } catch (e) {
      console.error("exam-day", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const statusTone = (s: string) => {
    if (s === "APPROVED") return "bg-emerald-500/15 text-emerald-400";
    if (s === "PENDING") return "bg-amber-500/15 text-amber-400";
    if (s === "ESCALATED") return "bg-rose-500/15 text-rose-400";
    return "bg-[var(--bg-elevated)] text-[var(--text-muted)]";
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Exam Day Operations"
        subtitle="Clearance desk + candidate attendance for exam-day gate access"
        onRefresh={load}
      />

      {/* Clearance desk */}
      <WidgetBoundary title="Clearance desk">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Pending approvals by stage</p>
          </div>
          {stageSummary.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="w-6 h-6" />} title="No pending approvals" description="The exam clearance desk is clear." />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {stageSummary.map((s, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{s.current_stage}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] ${statusTone(s.status)}`}>{s.status}</span>
                  <span className="text-sm font-bold text-[var(--action-primary)] w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Authorised access */}
      <WidgetBoundary title="Authorised access">
        <div className="glass-card">
          {authorised.length === 0 ? (
            <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="No authorised candidates" description="Exam access requests appear here when submitted." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-3 text-left">Candidate</th>
                    <th className="p-3 text-left">Stage</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {authorised.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                      <td className="p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{r.candidate_name ?? "—"}</p>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">{r.roll ? `${r.roll} · ` : ""}{r.candidate_unique_id ?? ""}</p>
                      </td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">{r.current_stage ?? "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${statusTone(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">
                        {r.sla_deadline ? new Date(r.sla_deadline).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Attendance */}
      <WidgetBoundary title="Candidate attendance">
        <div className="glass-card">
          {attendance.length === 0 ? (
            <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="No attendance recorded" description="Candidate check-ins appear here once recorded." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-3 text-left">Candidate</th>
                    <th className="p-3 text-left">Roll</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {attendance.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                      <td className="p-3 text-sm font-medium text-[var(--text-primary)]">{r.candidate_name ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{r.roll ?? "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${r.status === "PRESENT" ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">
                        {r.recorded_at ? new Date(r.recorded_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SysadminExamDayPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SysadminExamDayInner />
    </AuthGuard>
  );
}
