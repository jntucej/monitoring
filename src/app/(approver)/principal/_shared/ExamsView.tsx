"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface ExamException {
  id?: string;
  ticket_number?: string;
  student_name?: string;
  student?: { name?: string };
  reason?: string;
  status?: string;
  created_at?: string;
}

interface ExamExceptionsResponse {
  success?: boolean;
  data: ExamException[];
}

export function ExamsView() {
  const { data, loading } = useApiResource<ExamExceptionsResponse>(
    "/api/exam/access-exceptions",
    { ttlMs: 30_000 }
  );

  const exceptions = Array.isArray(data?.data) ? data.data : [];
  const pendingCount = exceptions.filter((e) => e.status === "PENDING" || !e.status).length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Examination Oversight</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Exam clearance queues, attendance, and hall exceptions
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label="Total Clearances" value={exceptions.length} />
        <KpiCard label="Pending Action" value={pendingCount} tone={pendingCount > 0 ? "warn" : "ok"} />
        <KpiCard
          label="Superintendent Status"
          value="Synchronized"
          tone="ok"
        />
      </div>

      {loading && exceptions.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : exceptions.length === 0 ? (
        <EmptyState title="No exam exceptions" description="No hall clearance or exam exceptions reported." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {exceptions.map((e, idx) => (
              <li
                key={e.id ?? idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{e.student_name ?? e.student?.name ?? "Student"}</p>
                  <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                    {e.status ?? "PENDING"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{e.reason ?? "Exam hall clearance"}</p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<ExamException>
              columns={[
                {
                  header: "Candidate",
                  accessor: (r) => r.student_name ?? r.student?.name ?? "Candidate",
                },
                {
                  header: "Ticket",
                  accessor: (r) => r.ticket_number ?? "—",
                },
                {
                  header: "Reason",
                  accessor: (r) => r.reason ?? "Exam hall clearance",
                },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                      {r.status ?? "PENDING"}
                    </span>
                  ),
                },
              ]}
              data={exceptions}
              keyExtractor={(r) => r.id ?? r.ticket_number ?? "exam-row"}
            />
          </div>
        </>
      )}
    </div>
  );
}
