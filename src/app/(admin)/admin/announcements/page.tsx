"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

export default function AnnouncementsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <WidgetBoundary title="Announcements">
          <AnnouncementsManager />
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
