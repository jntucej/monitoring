"use client";
import { Suspense } from "react";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { AdminProfilePanel } from "../_panel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminProfileSecurity() {
  return (
    <Suspense fallback={<PageLoading />}>
      <div className="space-y-4 p-4 sm:p-6">
        <ContextSituationBar
          roleLabel="Campus Admin"
          purpose="Manage your password, active sessions, and two-factor authentication for your admin account."
          contextLabel="Profile · Security"
          why="Revoking a session here immediately signs that device out and forces a new login."
          statusSummary="Keep your admin credentials current — inactive or exposed sessions are a top escalation trigger."
          primaryAction={{ label: "Personal", href: "/admin/profile/personal" }}
          secondaryAction={{ label: "Appearance", href: "/admin/profile/appearance" }}
        />
        <AdminProfilePanel tab="security" />
      </div>
    </Suspense>
  );
}
