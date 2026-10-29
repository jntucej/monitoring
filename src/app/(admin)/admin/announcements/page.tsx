"use client";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

export default function AnnouncementsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-4 sm:p-6 space-y-4 sm:space-y-6">
        <PageHeader
          title="Campus Announcements"
          subtitle="Publish, schedule, and manage campus-wide notices"
        />
        <WidgetBoundary title="Announcements">
          <AnnouncementsManager />
        </WidgetBoundary>
      </div>
    
    

  );
}
