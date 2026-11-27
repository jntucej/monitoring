"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function FacultyProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="Faculty"
      roleKey="faculty"
      homeHref="/faculty"
    />
  );
}
