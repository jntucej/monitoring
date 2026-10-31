"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { UtensilsCrossed } from "lucide-react";

export default function StudentMessTokenPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon={<UtensilsCrossed className="w-8 h-8" />}
        title="Mess Meal Token"
        description="Generate and show your digital meal token for today's dining."
      />
    </div>
  );
}
