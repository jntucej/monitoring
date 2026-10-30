"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { DelegationHistory } from "@/components/principal/delegation/DelegationForm";

function DelegateHistoryPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Delegation History</h1>
      <DelegationHistory />
    </div>
  );
}

export default function DelegateHistoryPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <DelegateHistoryPageInner />
    </Suspense>
  );
}
