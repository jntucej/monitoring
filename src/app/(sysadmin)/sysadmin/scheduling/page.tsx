// src/app/(sysadmin)/sysadmin/scheduling/page.tsx
// SCAFFOLD:RICH-PAGE — thin wrapper; the (sysadmin) layout owns the shell.
import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { SchedulingPanel } from "@/components/sysadmin/SchedulingPanel";
import Loading from "./loading";

export default function SchedulingPage() {
  return (
    <GuardedPage minTier={100}>
      <Suspense fallback={<Loading />}>
        <SchedulingPanel />
      </Suspense>
    </GuardedPage>
  );
}
