"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function HostelManagerResidentsPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Users className="w-8 h-8" />}
        title="All Residents"
        description="Directory of current hostel residents and occupancy status."
      />
    </div>
  );
}
