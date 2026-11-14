"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Clock } from "lucide-react";

export default function DeputyWardenCurfewOversightPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Clock className="size-6" />}
        title="Curfew Oversight"
        description="Hostel curfew check and student presence monitoring."
      />
    </div>
  );
}
