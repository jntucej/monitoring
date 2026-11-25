"use client";
import { Suspense } from "react";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { AdminProfilePanel } from "../_panel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminProfileAppearance() {
  return (
    <Suspense fallback={<PageLoading />}>
      <div className="space-y-4 p-4 sm:p-6">
        <ContextSituationBar
          roleLabel="Campus Admin"
          purpose="Adjust your personal appearance preferences — theme, density, and dashboard layout."
          contextLabel="Profile · Appearance"
          why="These preferences apply only to your account and never affect other users."
          statusSummary="Your appearance settings persist across all devices signed in to this account."
          primaryAction={{ label: "Personal", href: "/admin/profile/personal" }}
          secondaryAction={{ label: "Security", href: "/admin/profile/security" }}
        />
        <AdminProfilePanel tab="appearance" />
      </div>
    </Suspense>
  );
}
