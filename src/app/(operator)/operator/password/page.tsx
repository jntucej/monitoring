"use client";

import { Suspense } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { OperatorChangePasswordCard } from "@/components/operator/profile/OperatorChangePassword";

function OperatorPasswordInner() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Change Password</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
          Update your account password. You will be signed out of all devices after changing.
        </p>
      </div>

      <OperatorWidgetBoundary title="">
        <OperatorChangePasswordCard />
      </OperatorWidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorPasswordPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorPasswordInner />
    </Suspense>
  );
}
