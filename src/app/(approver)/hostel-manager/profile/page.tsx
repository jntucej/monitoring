"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function HostelManagerProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Hostel Manager"
      roleKey="hostel_manager"
      homeHref="/hostel-manager"
    />
  );
}
