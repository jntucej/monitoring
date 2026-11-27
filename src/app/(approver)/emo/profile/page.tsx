"use client";

import { StandardRoleProfilePage } from "@/components/shared/profile/StandardRoleProfilePage";

export default function EmoProfilePage() {
  return (
    <StandardRoleProfilePage
      roleLabel="EMO"
      roleKey="emo"
      homeHref="/emo"
    />
  );
}
