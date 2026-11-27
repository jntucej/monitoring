"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function VicePrincipalHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["vice_principal", "principal", "admin", "sysadmin"]}
      roleLabel="Vice Principal"
      homeHref="/vice-principal"
      area="hostel"
      enforceVpPrivacy
    />
  );
}
