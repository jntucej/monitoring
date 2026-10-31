"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function ParentChildRequestsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon={<Users className="w-8 h-8" />}
        title="Child Requests"
        description="Leave, outpass, and permission requests submitted by your child."
      />
    </div>
  );
}
