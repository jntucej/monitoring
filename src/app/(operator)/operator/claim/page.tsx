"use client";

import { OperatorGateClaimPanel } from "@/components/operator/OperatorGateClaimPanel";

export default function OperatorClaimPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OperatorGateClaimPanel />
      </div>
    </div>
  );
}
