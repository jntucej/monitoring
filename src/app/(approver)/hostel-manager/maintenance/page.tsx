"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Wrench } from "lucide-react";

export default function HostelManagerMaintenancePage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Wrench className="w-8 h-8" />}
        title="Hostel Maintenance"
        description="Hostel maintenance tickets and facility repair requests."
      />
    </div>
  );
}
