"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Home } from "lucide-react";

export default function CaretakerBuildingsPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Home className="w-8 h-8" />}
        title="Buildings & Facilities"
        description="Campus building registry and facilities management."
      />
    </div>
  );
}
