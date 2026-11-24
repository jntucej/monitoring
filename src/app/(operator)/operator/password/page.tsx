"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { Suspense } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";

import { OperatorChangePasswordCard } from "@/components/operator/profile/OperatorChangePassword";

function OperatorPasswordInner() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <ContextSituationBar
        roleLabel="Gate Operator"
        purpose="Update operator account password and authentication credentials"
        contextLabel="Account Security"
        statusSummary="Ensure terminal and account security by regularly maintaining your login credentials."
        primaryAction={{ label: "Operator Profile", href: "/operator/profile" }}
        secondaryAction={{ label: "Kiosk PIN", href: "/operator/kiosk-pin" }}
      />
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-primary">Change Password</h2>
        <p className="text-xs text-muted mt-1 min-w-0">
          Update your account password. You will be signed out of all devices after changing.
        </p>
      </div>

      <OperatorWidgetBoundary title="">
        <OperatorChangePasswordCard />
      </OperatorWidgetBoundary>

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
