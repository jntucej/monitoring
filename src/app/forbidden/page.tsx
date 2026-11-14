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
    const route = getDefaultRouteForRole(user?.role || "student", user?.gateId);
    router.push(route);
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-bg-base text-text-primary p-4">
      <div className="surface-card max-w-md w-full text-center space-y-6 bg-bg-surface p-8">
        <div className="size-6 bg-rose-500/10 border border-rose-500/20 text-action-danger rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary mb-3">403 - Access Forbidden</p>
          <p className="text-sm text-text-muted">
            You do not have the required administrative role or privileges to access this resource.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <Button onClick={handleGoToDashboard} variant="primary" className="w-full justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
