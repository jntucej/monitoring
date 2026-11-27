"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function PrincipalHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["principal", "admin", "sysadmin"]}
      roleLabel="Principal"
      homeHref="/principal"
      area="institutional"
    />
  );
}
