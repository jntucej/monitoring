"use client";


import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getDefaultRouteForRole } from "@/lib/route-helpers";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="size-6 bg-rose-500/10 border border-rose-500/20 text-action-danger rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-base font-semibold text-text-primary">403 — Access Restricted</h1>
          <p className="text-sm text-text-muted">
            You don&apos;t have permission to view this page with your current account.
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
