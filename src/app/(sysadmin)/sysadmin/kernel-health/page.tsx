"use client";

/**
 * /sysadmin/kernel-health — Kernel Autopilot, Outbox DLQ & Retention.
 * KPI strip + 3-tab operations (Outbox DLQ & Replay / LLM Circuit & ECA /
 * Dedup & R2 Retention Ledger). Catalog-driven, zero-hardcoded, live-DB.
 */
import { Suspense, useState } from "react";
import { SysadminShell } from "@/components/sysadmin/SysadminShell";
import { PageLoading } from "@/components/shared/LoadingStates";
import { SysadminHarnessPill, SysadminHarnessDrawer } from "@/components/sysadmin/SysadminHarnessDrawer";

export default function SysadminKernelHealthPage() {
  const [harnessOpen, setHarnessOpen] = useState(false);
  return (
    <Suspense fallback={<PageLoading />}>
      <SysadminShell view="kernel" />
      <SysadminHarnessPill onOpen={() => setHarnessOpen(true)} />
      <SysadminHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </Suspense>
  );
}
