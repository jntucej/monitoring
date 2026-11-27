"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function OieHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["oie", "principal", "vice_principal", "admin", "sysadmin"]}
      roleLabel="OIE"
      homeHref="/oie"
      area="exam"
    />
  );
}
