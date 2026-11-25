"use client";


import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ChangePasswordCard } from "@/components/shared/ChangePasswordCard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-2xl p-6 space-y-5">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to settings
        </Link>

        <ContextSituationBar
          roleLabel="Account Owner"
          purpose="Update password credentials to secure portal access across web and mobile."
          contextLabel="Credential Security"
          statusTone="warn"
          statusPill="Re-auth Enforced"
          statusSummary="Changing your password will immediately invalidate all other active sessions and prompt a fresh login."
          secondaryAction={{ label: "Settings", href: "/settings" }}
        />

        <ChangePasswordCard />
      </div>
    </AuthGuard>
  );
}