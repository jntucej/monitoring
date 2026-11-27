"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function DeputyWardenProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Deputy Warden"
      roleKey="deputy_warden"
      homeHref="/deputy-warden"
    />
  );
}
