"use client";

import { Suspense } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QrCode } from "lucide-react";

function StudentIdInner() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6 min-w-0">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Digital Campus ID Card</p>
      </div>
      <div className="max-w-md mx-auto sm:max-w-none">
        <DigitalIdCard />
      </div>
      <DevContactStrip />
    </div>
  );
}

export default function StudentIdPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentIdInner />
    </Suspense>
  );
}
