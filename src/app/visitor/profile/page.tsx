"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function VisitorProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Visitor"
      roleKey="visitor"
      homeHref="/visitor"
    />
  );
}
