"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function CaretakerProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Caretaker"
      roleKey="caretaker"
      homeHref="/caretaker"
    />
  );
}
