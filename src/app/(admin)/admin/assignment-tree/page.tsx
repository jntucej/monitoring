"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ReactiveAssignmentTree } from "@/components/governance/ReactiveAssignmentTree";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminAssignmentTreePage() {
  return (
    <AuthGuard allowedRoles={["hod", "vice_principal", "principal", "admin", "sysadmin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Manage and monitor assignment tree for campus operations."
        contextLabel="Assignment Tree"
        statusSummary="Review current assignment tree state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Hierarchy &amp; Student Assignment Tree
            </h1>
            <p className="text-xs text-text-muted">
              Manage department cohorts, hostel allocations, CR designations, and guardian links
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/student-representatives"
              className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated"
            >
              Manage CRs &rarr;
            </Link>
            <Link
              href="/admin/classes"
              className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated"
            >
              Classes &rarr;
            </Link>
          </div>
        </header>

        <ReactiveAssignmentTree />
      </div>
    </AuthGuard>
  );
}
