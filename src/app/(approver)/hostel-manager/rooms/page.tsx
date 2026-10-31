"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Building2 } from "lucide-react";

export default function HostelManagerRoomsPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Building2 className="w-8 h-8" />}
        title="Hostel Rooms"
        description="Hostel block, floor, and room inventory management."
      />
    </div>
  );
}
