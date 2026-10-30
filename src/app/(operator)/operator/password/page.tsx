"use client";

import { Suspense } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { OperatorChangePasswordCard } from "@/components/operator/profile/OperatorChangePassword";

function OperatorPasswordInner() {
  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 md:px-6 min-w-0">
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
