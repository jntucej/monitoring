"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function DeputyWardenHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"]}
      roleLabel="Deputy Warden"
      homeHref="/deputy-warden"
      area="hostel"
    />
  );
}
