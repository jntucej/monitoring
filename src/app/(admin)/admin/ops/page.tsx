"use client";

import { OpsCompliancePanel } from "@/components/security/OpsCompliancePanel";

export default function AdminOpsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Admin Operations, Drills & Compliance</h1>
      <OpsCompliancePanel />
    </div>
  );
}
