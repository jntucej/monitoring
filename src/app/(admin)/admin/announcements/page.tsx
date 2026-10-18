"use client";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

export default function AnnouncementsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <WidgetBoundary title="Announcements">
          <AnnouncementsManager />
        </WidgetBoundary>
      </div>
    
    

  );
}
