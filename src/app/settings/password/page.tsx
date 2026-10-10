"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ChangePasswordCard } from "@/components/shared/ChangePasswordCard";
import { ArrowLeft } from "lucide-react";

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-2xl p-6 space-y-5">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to settings
        </Link>

        <ChangePasswordCard />
      </div>
    </AuthGuard>
  );
}