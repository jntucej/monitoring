"use client";
// src/app/(approver)/oic/queue/page.tsx  → mounted at /oic/queue
// SCAFFOLD:QUEUE — thin wrapper around OieQueuePanel.
// Regenerate with: node scripts/scaffold-stage-queue.mjs new oic --force
//
// Why this page replaces the old exam-permissions screen:
//   1. Two useApiResource calls (oie + vp) + two PermissionLists + a
//      clearCache() in the refresh path caused double fetching and flicker.
//   2. Both tabs rendered Approve/Reject regardless of who was signed in, so
//      an OIE user could act on a VP-stage row → server FORBIDDEN.
//   3. No support surface existed for approvers.
//
// Now: ONE fetch, stage-gated buttons, plus a universal support form.

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { UniversalSupportForm } from "@/components/shared/UniversalSupportForm";
import { OieQueuePanel } from "@/components/approver/OieQueuePanel";
import type { Role } from "@/lib/types";

const ALLOWED: Role[] = ["oie", "exam_branch", "vice_principal", "principal", "admin", "sysadmin"] as Role[];

function OicQueueInner() {
  return (
    <GuardedPage allowedRoles={ALLOWED} minTier={75}>
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <header>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Exam Desk Queue</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Rows at other stages are read-only. Actions apply to your stage only.
          </p>
        </header>

        <WidgetBoundary title="Queue">
          <OieQueuePanel title="Exam Permissions" />
        </WidgetBoundary>

        <WidgetBoundary title="Support">
          <UniversalSupportForm />
        </WidgetBoundary>

        <DevContactStrip />
      </div>
    </GuardedPage>
  );
}

export default function OicQueuePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OicQueueInner />
    </Suspense>
  );
}
