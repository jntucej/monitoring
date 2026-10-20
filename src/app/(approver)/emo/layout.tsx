import React, { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

export default function EmoConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["emo"] as Role[]}>
      <RoleConsole role="emo" roleRoot="/emo">
        <Suspense fallback={<PageLoading />}>
          <DevContactStrip />
          {children}
        </Suspense>
      </RoleConsole>
    </AuthGuard>
  );
}
