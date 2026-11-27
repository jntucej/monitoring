"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function GuardianProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Guardian"
      roleKey="guardian"
      homeHref="/guardian"
    />
  );
}
