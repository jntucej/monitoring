"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function PrincipalProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Principal"
      roleKey="principal"
      homeHref="/principal"
      purpose="Executive account details, statutory credentials, and institutional delegation parameters."
    />
  );
}
