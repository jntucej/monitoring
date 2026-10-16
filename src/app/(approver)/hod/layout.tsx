"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";

/**
 * HOD layout — the RoleConsole (Ops Console) shell for the HOD role.
 *
 * Migrated off the local sticky tab bar. The full shell (IconRail + main
 * column + ContextPanel + StatusBar + CommandBar) is provided by RoleConsole.
 * Sub-pages pass their content through `children`, which RoleConsole renders
 * into the main column; the HOD root page contributes nothing so the default
 * Board / Kanban fallback shows through.
 *
 * The `getConsoleConfig("hod")` entry (and the KanbanBoard + permission
 * components) are landed by other agents in parallel; this layout simply
 * mounts `<RoleConsole role="hod" roleRoot="/hod">` and will light up once
 * that config + board support is in place.
 */
export default function HodConsoleLayout({ children }: { children?: ReactNode }) {
  return (
    <AuthGuard allowedRoles={["hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <RoleConsole role="hod" roleRoot="/hod">
          {children}
        </RoleConsole>
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}
