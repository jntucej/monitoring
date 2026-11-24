"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { TeamCurfewView } from "../../_shared/TeamCurfewView";

export default function TeamCurfewPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Enforce campus curfew policies, track overnight student transit, and flag late returns"
        contextLabel="Hostel Curfew Oversight"
        statusSummary="Live monitoring of student curfew windows, overdue returns, and security sweep coordination."
        severity="warn"
        primaryAction={{ label: "Workers on Post", href: "/supervisor/team/workers" }}
        secondaryAction={{ label: "Shift Schedule", href: "/supervisor/team/shifts" }}
      />
      <TeamCurfewView />
    </div>
  );
}
