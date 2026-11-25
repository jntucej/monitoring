"use client";

import { AlumniPanel } from "@/components/sysadmin/AlumniPanel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AlumniAutoPage() {
  return (
    <div className="space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Automated Alumni Deprovisioning"
        purpose="Automate graduating student cohort lifecycle state transitions, credential expirations, and access revocations."
        statusSummary="Batch evaluation daemon configured to detect program completion and schedule timely credential deprovisioning."
        why="Automated deprovisioning prevents lingering perimeter access privileges and reclaims system resources after academic completion."
        primaryAction={{ label: "Graduated Roster", href: "/sysadmin/alumni/graduated" }}
        secondaryAction={{ label: "Deprovisioned Archive", href: "/sysadmin/alumni/deprovisioned" }}
      />
      <AlumniPanel tab="auto" />
    </div>
  );
}
