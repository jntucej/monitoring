"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function HodHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["hod", "principal", "vice_principal", "admin", "sysadmin"]}
      roleLabel="HOD"
      homeHref="/hod"
      area="department"
    />
  );
}
