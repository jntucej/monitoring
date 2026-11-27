"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function MessProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Mess Incharge"
      roleKey="mess_incharge"
      homeHref="/mess"
    />
  );
}
