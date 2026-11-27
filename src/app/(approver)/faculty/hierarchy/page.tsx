"use client";

import { ScopedHierarchyPage } from "@/components/dashboard/ScopedHierarchyPage";

export default function FacultyHierarchyPage() {
  return (
    <ScopedHierarchyPage
      allowedRoles={["faculty", "hod", "admin", "sysadmin"]}
      roleLabel="Faculty"
      homeHref="/faculty"
      area="department"
    />
  );
}
