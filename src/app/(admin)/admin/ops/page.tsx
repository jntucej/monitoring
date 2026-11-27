"use client";

import { OpsCompliancePanel } from "@/components/security/OpsCompliancePanel";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";

export default function AdminOpsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Admin Operations, Drills & Compliance</h1>
      <OpsCompliancePanel />
      <SpatialPeopleMapWorkspace defaultArea="security" lockedArea compact />
    </div>
  );
}
