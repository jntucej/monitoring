"use client";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

export interface GuardedPageProps {
  allowedRoles?: Role[];
  minTier?: number;
  children: React.ReactNode;
}

export function GuardedPage({ allowedRoles, minTier = 0, children }: GuardedPageProps) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "student") as Role;
  const tier = getRoleTier(role);

  const roleOk = allowedRoles ? allowedRoles.includes(role) : true;
  const tierOk = tier >= minTier;

  if (!roleOk || !tierOk) {
    return (
      <AuthGuard>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Access denied — role {role} (tier {tier}) cannot open this workspace.
          </p>
        </div>
      </AuthGuard>
    );
  }
  return <AuthGuard allowedRoles={allowedRoles}>{children}</AuthGuard>;
}