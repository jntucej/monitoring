"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { KeyRound } from "lucide-react";

export default function OperatorKioskPinPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<KeyRound className="w-8 h-8" />}
        title="Kiosk PIN"
        description="Configure emergency PIN for kiosk terminal access."
      />
    </div>
  );
}
