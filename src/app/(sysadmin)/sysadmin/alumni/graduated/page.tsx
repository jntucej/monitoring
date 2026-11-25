"use client";

import { AlumniPanel } from "@/components/sysadmin/AlumniPanel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AlumniGraduatedPage() {
  return (
    <div className="space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Graduated Student Registry"
        purpose="Maintain confirmed alumni registries, track degree completion records, and manage transition grace periods."
        statusSummary="Alumni database tracking past graduating cohorts and verified educational clearance status."
        why="Maintaining clean graduation status preserves student achievement records while enforcing timely perimeter privilege expiration."
        primaryAction={{ label: "Auto Deprovisioning", href: "/sysadmin/alumni/auto" }}
        secondaryAction={{ label: "Deprovisioned Archive", href: "/sysadmin/alumni/deprovisioned" }}
      />
      <AlumniPanel tab="graduated" />
    </div>
  );
}
