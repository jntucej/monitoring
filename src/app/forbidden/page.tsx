"use client";


import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getDefaultRouteForRole } from "@/lib/route-helpers";
import { ShieldAlert, ArrowLeft, LogIn, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function ForbiddenPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleGoToDashboard = () => {
    if (!user?.role) {
      router.push("/login");
      return;
    }
    const route = getDefaultRouteForRole(user.role, user.gateId);
    router.push(route);
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-bg-base text-text-primary p-4">
      <div className="surface-card max-w-md w-full text-center space-y-6 bg-bg-surface p-8">
        <BrandLogo variant="mark" size="sm" motion="static" status="alert" className="mx-auto opacity-90" />
        <ContextSituationBar
          roleLabel={user?.role ? user.role.toUpperCase() : "Unauthenticated"}
          purpose="Enforce role-based access control and prevent unauthorized view transitions."
          contextLabel="Access Control Gate"
          statusTone="critical"
          statusPill="HTTP 403 Forbidden"
          statusSummary="Your current account role does not hold clearance for the requested URL path."
          primaryAction={{
            label: user?.role ? "Go to Dashboard" : "Sign In",
            onClick: handleGoToDashboard,
          }}
          secondaryAction={{ label: "Campus Support", href: "/support" }}
        />

        <div className="size-6 bg-rose-500/10 border border-rose-500/20 text-action-danger rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-base font-semibold text-text-primary">403 — Access Restricted</h1>
          <p className="text-sm text-text-muted">
            You don&apos;t have permission to view this page with your current account.
          </p>
          <p className="text-xs text-text-secondary">
            If you believe this is an error or require elevated clearance, contact a campus administrator or file a ticket in Support.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <Button onClick={handleGoToDashboard} variant="primary" className="w-full justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {user?.role ? "Go to My Dashboard" : "Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
