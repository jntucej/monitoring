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
        purpose="Publish, schedule, and manage campus-wide notices"
        contextLabel="Publish, schedule, and manage campus-wide notices"
        statusSummary="Review current publish, schedule, and manage campus-wide notices state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
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
