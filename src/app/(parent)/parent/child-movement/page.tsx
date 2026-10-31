"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function ParentChildMovementPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Users className="w-8 h-8" />}
        title="Child Movement"
        description="Real-time gate check-in and check-out logs for your child."
      />
    </div>
  );
}
