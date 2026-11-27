"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function OperatorHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["operator", "supervisor", "admin", "sysadmin"]}
      roleLabel="Gate Operator"
      homeHref="/operator"
      area="security"
    />
  );
}
