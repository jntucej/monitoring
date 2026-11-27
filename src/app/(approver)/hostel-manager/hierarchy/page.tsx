"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function HostelManagerHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["hostel_manager", "principal", "vice_principal", "admin", "sysadmin"]}
      roleLabel="Hostel Manager"
      homeHref="/hostel-manager"
      area="hostel"
    />
  );
}
