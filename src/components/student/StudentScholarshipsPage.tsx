"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Loader2, Award, Inbox } from "lucide-react";

interface Scholarship {
  id: string;
  scheme: string;
  status: string;
  amount: number | null;
  academicYear: number | null;
  notes: string | null;
}

export function StudentScholarshipsPage() {
  const [data, setData] = useState<Scholarship[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/scholarships", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) setData(json.data.scholarships ?? []);
        else setError(json.error?.message ?? "Failed to load scholarships");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load scholarships");
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Scholarships</h1>
        <p className="text-sm text-text-muted">Your scholarship awards and applications.</p>
      </div>

      {error && <div className="surface-card bg-rose-500/10 p-3 text-sm text-action-danger">{error}</div>}
      {data === null && !error && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading scholarships…
        </div>
      )}

      {data?.length === 0 && (
        <div className="surface-card p-8 text-center">
          <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No scholarships on record.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <WidgetBoundary name="student-scholarships" title="Scholarships">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.map((s) => (
              <div key={s.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="w-4 h-4 text-action-info shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{s.scheme}</p>
                      <p className="text-xs text-text-muted">
                        {s.academicYear ? `AY ${s.academicYear}` : "—"}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                    s.status === "AWARDED" || s.status === "APPROVED"
                      ? "bg-emerald-500/15 text-action-success"
                      : s.status === "PENDING"
                        ? "bg-amber-500/15 text-action-warning"
                        : "bg-bg-elevated text-text-muted"
                  }`}>
                    {s.status}
                  </span>
                </div>
                {s.amount !== null && (
                  <p className="text-lg font-bold text-action-primary mt-2 tabular-nums">
                    ₹{s.amount.toLocaleString("en-IN")}
                  </p>
                )}
                {s.notes && <p className="text-xs text-text-muted mt-1">{s.notes}</p>}
              </div>
            ))}
          </div>
        </WidgetBoundary>
      )}
    </div>
  );
}

export default StudentScholarshipsPage;
