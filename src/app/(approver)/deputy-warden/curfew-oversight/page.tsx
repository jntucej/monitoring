"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Clock } from "lucide-react";

export default function DeputyWardenCurfewOversightPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Clock className="w-8 h-8" />}
        title="Curfew Oversight"
        description="Hostel curfew check and student presence monitoring."
      />
    </div>
  );
}
