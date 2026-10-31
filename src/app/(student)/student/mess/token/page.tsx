"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { UtensilsCrossed } from "lucide-react";

export default function StudentMessTokenPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<UtensilsCrossed className="w-8 h-8" />}
        title="Mess Meal Token"
        description="Generate and show your digital meal token for today's dining."
      />
    </div>
  );
}
