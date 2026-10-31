"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function ParentChildRequestsPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Users className="w-8 h-8" />}
        title="Child Requests"
        description="Leave, outpass, and permission requests submitted by your child."
      />
    </div>
  );
}
