"use client";
import { Suspense } from "react";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { AdminProfilePanel } from "../_panel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminProfilePersonal() {
  return (
    <Suspense fallback={<PageLoading />}>
      <div className="space-y-4 p-4 sm:p-6">
        <ContextSituationBar
          roleLabel="Campus Admin"
          purpose="Review and update your personal contact details, role, and institutional identifiers."
          contextLabel="Profile · Personal"
          why="Changing your email or phone here updates where system alerts and recovery links are delivered."
          statusSummary="Your profile details stay in sync with the institutional user registry."
          primaryAction={{ label: "Security", href: "/admin/profile/security" }}
          secondaryAction={{ label: "Appearance", href: "/admin/profile/appearance" }}
        />
        <AdminProfilePanel tab="personal" />
      </div>
    </Suspense>
  );
}
