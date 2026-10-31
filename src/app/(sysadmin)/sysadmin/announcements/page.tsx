"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

export default function SysAdminAnnouncementsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
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
