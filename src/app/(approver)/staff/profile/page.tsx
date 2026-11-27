"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function StaffProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Staff"
      roleKey="staff"
      homeHref="/staff"
    />
  );
}
