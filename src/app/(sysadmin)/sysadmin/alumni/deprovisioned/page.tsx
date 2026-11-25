"use client";

import { AlumniPanel } from "@/components/sysadmin/AlumniPanel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AlumniDeprovisionedPage() {
  return (
    <div className="space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Deprovisioned Student Ledger"
        purpose="Audit retired student accounts, verify biometric credential deactivations, and review archival compliance logs."
        statusSummary="Historical ledger of revoked student credentials and archived perimeter access records."
        why="Verifying deprovisioned accounts protects institutional data privacy and ensures ex-students cannot authenticate at campus turnstiles."
        primaryAction={{ label: "Auto Deprovisioning", href: "/sysadmin/alumni/auto" }}
        secondaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
      />
      <AlumniPanel tab="deprovisioned" />
    </div>
  );
}
