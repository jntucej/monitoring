"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ReactiveAssignmentTree } from "@/components/governance/ReactiveAssignmentTree";

export default function PrincipalAssignmentTreePage() {
  return (
    <AuthGuard allowedRoles={["hod", "vice_principal", "principal", "admin", "sysadmin"]}>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              Hierarchy &amp; Student Assignment Tree
            </h1>
            <p className="text-xs text-text-muted">
              Live institutional tree connecting governance roles, departments, hostel blocks, and assigned students
            </p>
          </div>
          <Link
            href="/principal/people"
            className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-action-primary hover:bg-bg-elevated"
          >
            People Register &rarr;
          </Link>
        </header>

        <ReactiveAssignmentTree />
      </div>
    </AuthGuard>
  );
}
