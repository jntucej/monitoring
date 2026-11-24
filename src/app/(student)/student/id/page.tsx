"use client";

import { Suspense } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { QrCode } from "lucide-react";

function StudentIdInner() {
  const hour = new Date().getHours();
  const mins = new Date().getMinutes();
  const inCurfew = hour > 21 || (hour === 21 && mins >= 30) || hour < 6;

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
      <ContextSituationBar
        roleLabel="Student"
        purpose="Present your secure campus barcode/QR identity for verification at gates, library, and mess"
        contextLabel="Digital Student Credential"
        severity={inCurfew ? "warn" : "ok"}
        statusPill={inCurfew ? "Curfew Window (21:30–06:00)" : "Active Credential"}
        statusSummary={
          inCurfew
            ? "Curfew hours (21:30–06:00) are active — an approved gate pass is required alongside your ID for off-campus movement."
            : "Carry your authenticated student barcode and QR token for turnstiles and checkpoints."
        }
        primaryAction={{ label: "My Gate Passes", href: "/student/passes" }}
        secondaryAction={{ label: "New Pass Request", href: "/student/permissions/new" }}
      />
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
