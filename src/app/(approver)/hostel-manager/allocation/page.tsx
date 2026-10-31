"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Package } from "lucide-react";

export default function HostelManagerAllocationPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Package className="w-8 h-8" />}
        title="Room & Bed Allocation"
        description="Manage student room allocations and bed assignments."
      />
    </div>
  );
}
