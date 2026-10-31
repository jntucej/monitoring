"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { KeyRound } from "lucide-react";

export default function OperatorClaimPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<KeyRound className="w-8 h-8" />}
        title="Claim Gate"
        description="Gate assignment and kiosk claim management."
      />
    </div>
  );
}
