"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SysAdminAnnouncementsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Campus Announcements Desk"
        purpose="Draft, schedule, and broadcast official campus-wide advisories across student feeds, staff consoles, and gate displays."
        statusSummary="Broadcast pipeline operational for general student notices, emergency alerts, and gate operational bulletins."
        why="Centralized announcements broadcast urgent curfew changes, safety advisories, and facility alerts to all stakeholders in real time."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "Telegram Bot", href: "/sysadmin/bot" }}
      />
        <PageHeader
          title="Campus Announcements"
          subtitle="Publish, schedule, and manage campus-wide notices"
        />
        <WidgetBoundary title="Announcements">
          <AnnouncementsManager />
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
