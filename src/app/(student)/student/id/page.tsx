"use client";
<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
=======
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

import { Suspense } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QrCode } from "lucide-react";

function StudentIdInner() {
  return (
<<<<<<< HEAD
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Digital ID Card</p>
        <p className="text-[var(--text-muted)]">Show this card at the gate for scanning</p>
=======
    <div className="space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Digital Campus ID Card</p>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
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
