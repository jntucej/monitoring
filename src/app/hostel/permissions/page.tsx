"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { ShieldCheck } from "lucide-react";

export default function HostelPermissionsPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hostel_manager") as Role;
  const tier = getRoleTier(role);

  return (
    <GuardedPage minTier={55} allowedRoles={["hostel_manager", "caretaker", "deputy_warden", "warden", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
              Hostel Permissions
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
              {user?.name ? ` · ${user.name}` : ""}
            </p>
          </div>

          <WidgetBoundary title="Hostel Queue">
            <PermissionList
              workflowType="hostel"
              title="Hostel Permissions"
              subtitle={"Hostel outpass & leave approval queue"}
            />
          </WidgetBoundary>

          <DevContactStrip />
        </div>
      </Suspense>
    </GuardedPage>
  );
}
