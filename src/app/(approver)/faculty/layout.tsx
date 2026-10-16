"use client";

import React from "react";
import { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Faculty console layout — mounts the RoleConsole shell.
 *
 * The local tab bar (TABS / FacultyTabs) is removed. The shell is the
 * RoleConsole: IconRail + KanbanBoard (or feed) + ContextPanel + StatusBar +
 * CommandBar.
 *
 * The layout covers both /faculty (class teacher) and /faculty/subject
 * (subject faculty). It picks the console role from the current path:
 *   - /faculty/subject*  → role="subject_faculty", roleRoot="/faculty/subject"
 *   - everything else    → role="class_teacher", roleRoot="/faculty"
 *
 * Sub-pages pass their content through `children`; the RoleConsole default
 * fallback (Board / KanbanBoard) shows when the page renders nothing.
 */
export default function FacultyTabbedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSubject = pathname.startsWith("/faculty/subject");
  const role = isSubject ? "subject_faculty" : "class_teacher";
  const roleRoot = isSubject ? "/faculty/subject" : "/faculty";

  const consoleRole = useMemo(() => role, [role]);

  return (
    <AuthGuard allowedRoles={["faculty", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role={consoleRole} roleRoot={roleRoot}>
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
