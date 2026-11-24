"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

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
        <ContextSituationBar
          roleLabel="Principal"
          purpose="Visualize and manage institutional reporting hierarchy, academic departments, and hostel allocations"
          contextLabel="Institutional Hierarchy Tree"
          statusSummary="Interactive hierarchy connecting governance roles, academic departments, hostel wings, and students."
          primaryAction={{ label: "People Directory", href: "/principal/people" }}
          secondaryAction={{ label: "Departments Roster", href: "/principal/people/departments" }}
        />

        <ReactiveAssignmentTree />
      </div>
    </AuthGuard>
  );
}
