"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { Building2 } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  staffCount?: number;
}

function DepartmentsInner() {
  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (json.success) {
        setDepartments(json.data ?? []);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  return (
    <PrincipalWidgetBoundary title="Department Overview">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Building2 className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Departments</span>
          {departments && (
            <span className="text-xs text-[var(--text-muted)] ml-auto">{departments.length} total</span>
          )}
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {!departments && !error ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : departments && departments.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">No departments registered.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {departments?.map((d) => (
              <div
                key={d.code || d.name}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] min-w-0"
              >
                <div className="flex items-center justify-between min-w-0">
                  <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{d.name}</span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">{d.code}</span>
                </div>
                {d.hod && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    HOD: <span className="text-[var(--text-secondary)]">{d.hod}</span>
                  </p>
                )}
                {d.staffCount !== undefined && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{d.staffCount} staff</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <div className="px-4 sm:px-6 py-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Department Oversight</h1>
        <DepartmentsInner />
      </div>
    </Suspense>
  );
}
