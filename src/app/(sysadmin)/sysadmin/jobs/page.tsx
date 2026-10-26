"use client";

// src/app/(sysadmin)/sysadmin/jobs/page.tsx
// JOBS — kind cards, pollMs 30000, automation category.
// Thin wrapper: all logic lives in JobsContent (useDashboardData inside).

import { AuthGuard } from "@/components/shared/AuthGuard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { JobsContent } from "@/components/sysadmin/domains/automation/JobsContent";
import type { JobsData } from "@/components/sysadmin/domains/automation/types";
import { Clock } from "lucide-react";

export default function JobsPage() {
  const { data, loading, error } = useDashboardData<JobsData>("/api/admin/jobs/overview", {
    ttlMs: 90_000,
    pollMs: 30_000,
  });

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--action-primary)]" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Jobs</h1>
            <p className="text-xs text-[var(--text-muted)]">
              14-day scheduled job runs · success rate · heat matrix
            </p>
          </div>
        </div>
        {loading && !data ? (
          <div className="h-40 animate-pulse rounded-xl bg-[var(--bg-surface)] opacity-40" />
        ) : error && !data ? (
          <div
            role="alert"
            className="rounded-xl border border-[var(--action-danger)]/30 bg-[var(--action-danger)]/10 p-4 text-sm text-[var(--action-danger)]"
          >
            Failed to load job data: {error}
          </div>
        ) : data ? (
          <JobsContent data={data} />
        ) : null}
      </div>
    </AuthGuard>
  );
}
