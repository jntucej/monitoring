"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { UserCog } from "lucide-react";

export default function ParentContactInfoPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon={<UserCog className="w-8 h-8" />}
        title="Contact Info"
        description="Update emergency contact numbers and residential address."
      />
    </div>
  );
}
