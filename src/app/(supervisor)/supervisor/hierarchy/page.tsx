"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function SupervisorHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["supervisor", "principal", "admin", "sysadmin"]}
      roleLabel="Supervisor"
      homeHref="/supervisor"
      area="security"
    />
  );
}
