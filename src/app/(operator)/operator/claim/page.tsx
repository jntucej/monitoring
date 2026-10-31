"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { KeyRound } from "lucide-react";

export default function OperatorClaimPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <EmptyState
        icon={<KeyRound className="w-8 h-8" />}
        title="Claim Gate"
        description="Gate assignment and kiosk claim management."
      />
    </div>
  );
}
