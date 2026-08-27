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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-[var(--bg-surface)] border border-[var(--border)] p-8 rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">403 - Access Forbidden</h1>
          <p className="text-sm text-[var(--text-muted)]">
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
