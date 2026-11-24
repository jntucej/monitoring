"use client";

import { Suspense } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { PageLoading } from "@/components/shared/LoadingStates";

import { QrCode } from "lucide-react";

function StudentIdInner() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6 min-w-0">
      <div>
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-action-primary" />
          <h1 className="text-xl font-bold text-text-primary">Digital Campus ID Card</h1>
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Show this QR code at campus gates, library, or mess counters for quick verification.
        </p>
      </div>
      <div className="max-w-md mx-auto sm:max-w-none">
        <DigitalIdCard />
      </div>

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
