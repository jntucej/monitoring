"use client";

import { Suspense, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { FACULTY_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { useAuthStore } from "@/stores/authStore";
import { hasTeachingBinding } from "@/lib/teaching-binding";
import type { Role } from "@/lib/types";

const MANIFEST = {
    role: "class_teacher",
    brand: { short: "Faculty", long: "Teaching Console" },
  rootHref: "/faculty",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: FACULTY_NAV,
};

/**
 * Teaching-capability gate: any user with ≥1 active row in
 * faculty_assignments (keyed on user id) gets access to /faculty/*.
 * This is the "binding beats role" rule from the architecture doc:
 * a Principal with a CS-301 binding walks into the same pages,
 * scoped to CS-301. A Principal without a binding gets 403.
 */
function TeachingBindingGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setChecking(false);
      return;
    }
    hasTeachingBinding(user.id)
      .then((ok) => setAllowed(ok))
      .catch(() => setAllowed(false))
      .finally(() => setChecking(false));
  }, [user?.id]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="size-5 border-4 border-action-success border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 p-6">
        <p className="text-sm font-medium text-text-primary">No teaching assignment</p>
        <p className="text-xs text-text-muted text-center max-w-xs">
          You don&apos;t have an active teaching binding. Contact your HOD or the
          admin team to be assigned to a subject and class.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  // Core faculty (the "faculty" role is the teaching-capability role)
  // get through by role; all other roles need an active teaching binding.
  const user = useAuthStore((s) => s.user);
  const isCoreFaculty = user?.role === "faculty";

  return (
    <AuthGuard allowedRoles={["faculty", "admin", "sysadmin"] as Role[]}>
      {isCoreFaculty ? (
        <Suspense fallback={<PageLoading />}>
          <Shell>{children}</Shell>
        </Suspense>
      ) : (
        <TeachingBindingGate>
          <Shell>{children}</Shell>
        </TeachingBindingGate>
      )}
    </AuthGuard>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
      <GlobalEntityInspector />
    </>
  );
}
