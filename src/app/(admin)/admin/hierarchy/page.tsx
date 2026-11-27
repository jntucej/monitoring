"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function AdminHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["admin", "sysadmin"]}
      roleLabel="Admin"
      homeHref="/admin/overview"
      area="institutional"
    />
  );
}
