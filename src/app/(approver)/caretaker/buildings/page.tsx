"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Home } from "lucide-react";

export default function CaretakerBuildingsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon={<Home className="w-8 h-8" />}
        title="Buildings & Facilities"
        description="Campus building registry and facilities management."
      />
    </div>
  );
}
